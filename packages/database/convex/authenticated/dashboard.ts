import { ActionCache } from "@convex-dev/action-cache";
import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
} from "@effect/platform";
import {
	Analytics,
	ServerAnalyticsLayer,
} from "@packages/database/analytics/server/index";
import { make } from "@packages/discord-api/generated";
import { v } from "convex/values";
import { Cause, Effect, Runtime } from "effect";
import { api, components, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { type ActionCtx, authenticatedAction, internalAction } from "../client";
import { guildManagerAction } from "../client/guildManager";
import { getDiscordAccountWithToken, getTokenStatus } from "../shared/auth";
import { hasDashboardRoleAccess } from "../shared/guildManagerPermissions";
import {
	DISCORD_PERMISSIONS,
	getDashboardPermissionMask,
	getHighestRoleFromPermissions,
	hasPermission,
	sortServersByBotAndRole,
} from "../shared/shared";

export class ReauthRequiredError extends Error {
	public readonly code = "REAUTH_REQUIRED" as const;
	constructor(message = "Please sign in again to continue") {
		super(message);
		this.name = "ReauthRequiredError";
	}
}

export function getBackendAccessToken(): string {
	const token = process.env.BACKEND_ACCESS_TOKEN;
	return token ?? "";
}

type DiscordAuth = {
	scheme: "Bearer" | "Bot";
	token: string;
};

type DiscordApiClient = ReturnType<typeof make>;

const discordApi = (auth: DiscordAuth) =>
	Effect.gen(function* () {
		const httpClient = yield* HttpClient.HttpClient;
		return make(httpClient, {
			transformClient(client) {
				return Effect.succeed(
					client.pipe(
						HttpClient.mapRequest((req) =>
							HttpClientRequest.prependUrl(
								HttpClientRequest.setHeader(
									req,
									"Authorization",
									`${auth.scheme} ${auth.token}`,
								),
								"https://discord.com/api/v10",
							),
						),
					),
				);
			},
		});
	}).pipe(Effect.provide(FetchHttpClient.layer));

function extractDiscordErrorInfo(error: unknown): {
	status?: number;
	message?: string;
} {
	if (Runtime.isFiberFailure(error)) {
		const cause = error[Runtime.FiberFailureCauseId];
		const failures = Cause.failures(cause);
		for (const failure of failures) {
			const info = extractDiscordErrorInfo(failure);
			if (info.status || info.message) {
				return info;
			}
		}
	}
	if (
		typeof error === "object" &&
		error !== null &&
		"_tag" in error &&
		"response" in error
	) {
		const clientError = error as {
			_tag: string;
			response: { status: number };
			cause?: { message?: string };
		};
		return {
			status: clientError.response?.status,
			message: clientError.cause?.message ?? clientError._tag,
		};
	}
	return {};
}

function getDiscordStatus(error: unknown): number | undefined {
	if (
		typeof error === "object" &&
		error !== null &&
		"discordStatus" in error &&
		typeof (error as { discordStatus?: unknown }).discordStatus === "number"
	) {
		return (error as { discordStatus: number }).discordStatus;
	}
	return extractDiscordErrorInfo(error).status;
}

function hasDiscordStatus(
	error: unknown,
	statuses: readonly number[],
): boolean {
	const status = getDiscordStatus(error);
	return status !== undefined && statuses.includes(status);
}

async function runDiscordApi<T>(
	auth: DiscordAuth,
	action: string,
	operation: (client: DiscordApiClient) => Effect.Effect<T, unknown, never>,
): Promise<T> {
	const program = Effect.gen(function* () {
		const client = yield* discordApi(auth);
		return yield* operation(client);
	});

	try {
		return await Effect.runPromise(program);
	} catch (error) {
		const errorInfo = extractDiscordErrorInfo(error);
		if (errorInfo.status) {
			const newError = new Error(
				`Discord API error (${errorInfo.status}) while ${action}: ${errorInfo.message ?? "Unknown error"}`,
			);
			(newError as Error & { discordStatus: number }).discordStatus =
				errorInfo.status;
			throw newError;
		}
		throw error;
	}
}

async function fetchGuildsWithToken(token: string) {
	const guilds = await runDiscordApi(
		{
			scheme: "Bearer",
			token,
		},
		"listing user guilds",
		(client) => client.listMyGuilds(),
	);

	return guilds.map((guild) => ({
		id: guild.id,
		name: guild.name,
		icon: guild.icon ?? null,
		owner: guild.owner,
		permissions: guild.permissions,
	}));
}

function isDiscord401Error(error: unknown): boolean {
	if (Runtime.isFiberFailure(error)) {
		const cause = error[Runtime.FiberFailureCauseId];
		const failures = Cause.failures(cause);
		for (const failure of failures) {
			if (isDiscord401Error(failure)) {
				return true;
			}
		}
	}
	if (
		typeof error === "object" &&
		error !== null &&
		"discordStatus" in error &&
		(error as { discordStatus: number }).discordStatus === 401
	) {
		return true;
	}
	if (
		typeof error === "object" &&
		error !== null &&
		"_tag" in error &&
		"response" in error
	) {
		const clientError = error as { response: { status: number } };
		if (clientError.response?.status === 401) {
			return true;
		}
	}
	if (error instanceof Error) {
		const message = error.message;
		return message.includes("401") || message.includes("Unauthorized");
	}
	if (typeof error === "object" && error !== null) {
		const errorStr = JSON.stringify(error);
		return errorStr.includes("401") || errorStr.includes("Unauthorized");
	}
	return false;
}

type DiscordGuild = {
	id: string;
	name: string;
	icon: string | null;
	owner: boolean;
	permissions: string;
};

type RefreshTokenResult =
	| {
			success: true;
			accountId: bigint;
			accessToken: string;
	  }
	| {
			success: false;
			error: string;
			code:
				| "NOT_AUTHENTICATED"
				| "NO_REFRESH_TOKEN"
				| "REAUTH_REQUIRED"
				| "REFRESH_FAILED";
	  };

export const fetchDiscordGuilds = internalAction({
	args: {
		discordAccountId: v.int64(),
	},
	handler: async (ctx, args): Promise<DiscordGuild[]> => {
		const { discordAccountId } = args;

		const discordAccount = await getDiscordAccountWithToken(ctx);

		if (!discordAccount || discordAccount.accountId !== discordAccountId) {
			throw new ReauthRequiredError("Discord account not linked or mismatch");
		}

		async function refreshToken(): Promise<string> {
			const refreshResult: RefreshTokenResult = await ctx.runAction(
				internal.authenticated.discord_token.refreshAndGetValidToken,
				{},
			);

			if (!refreshResult.success) {
				throw new ReauthRequiredError(
					refreshResult.code === "REAUTH_REQUIRED" ||
						refreshResult.code === "NO_REFRESH_TOKEN"
						? refreshResult.error
						: "Your Discord session has expired. Please sign in again.",
				);
			}

			return refreshResult.accessToken;
		}

		const tokenStatus = getTokenStatus(discordAccount.accessTokenExpiresAt);
		let token =
			tokenStatus === "expired" || !discordAccount.accessToken
				? await refreshToken()
				: discordAccount.accessToken;

		try {
			return await fetchGuildsWithToken(token);
		} catch (error) {
			if (isDiscord401Error(error)) {
				token = await refreshToken();
				return await fetchGuildsWithToken(token);
			}
			throw error;
		}
	},
});

const getDiscordGuildsCache = () =>
	new ActionCache(components.actionCache, {
		action: internal.authenticated.dashboard.fetchDiscordGuilds,
		name: "discordGuilds",
		ttl: 300 * 1000, // 5 minutes in milliseconds
	});

export const discordGuildsCacheName = "discordGuilds";

function getDiscordBotToken(): string {
	const token = process.env.DISCORD_TOKEN;
	if (!token) {
		throw new Error("DISCORD_TOKEN environment variable is required");
	}
	return token;
}

function getDiscordBotAuth(): DiscordAuth {
	return {
		scheme: "Bot",
		token: getDiscordBotToken(),
	};
}

async function fetchGuildMemberRoleIdsWithBot(
	serverId: bigint,
	discordAccountId: bigint,
): Promise<bigint[] | null> {
	try {
		const member = await runDiscordApi(
			getDiscordBotAuth(),
			`getting guild member ${discordAccountId.toString()} in guild ${serverId.toString()}`,
			(client) =>
				client.getGuildMember(serverId.toString(), discordAccountId.toString()),
		);
		return member.roles.map((roleId) => BigInt(roleId));
	} catch (error) {
		if (hasDiscordStatus(error, [403, 404])) {
			return null;
		}
		throw error;
	}
}

async function fetchGuildRolesWithBot(serverId: bigint): Promise<
	Array<{
		id: string;
		name: string;
		color: number;
		position: number;
		managed: boolean;
	}>
> {
	const roles = await runDiscordApi(
		getDiscordBotAuth(),
		`listing guild roles for guild ${serverId.toString()}`,
		(client) => client.listGuildRoles(serverId.toString()),
	);

	return roles
		.filter((role) => role.id !== serverId.toString())
		.sort((left, right) => {
			if (left.position !== right.position) {
				return right.position - left.position;
			}
			const leftId = BigInt(left.id);
			const rightId = BigInt(right.id);
			if (leftId === rightId) {
				return 0;
			}
			return leftId > rightId ? -1 : 1;
		});
}

function normalizeRoleIds(roleIds: readonly bigint[]): bigint[] {
	return [...new Set(roleIds)].sort((left, right) => {
		if (left === right) {
			return 0;
		}
		return left < right ? -1 : 1;
	});
}

function haveSameRoleIds(
	left: readonly bigint[] | undefined,
	right: readonly bigint[] | undefined,
): boolean {
	const normalizedLeft = normalizeRoleIds(left ?? []);
	const normalizedRight = normalizeRoleIds(right ?? []);

	if (normalizedLeft.length !== normalizedRight.length) {
		return false;
	}

	return normalizedLeft.every(
		(roleId, index) => roleId === normalizedRight[index],
	);
}

type SyncedDashboardAccessState =
	| {
			status: "member_not_found";
			roleIds: bigint[];
			hasManageAccess: boolean;
			hasRoleAccess: false;
	  }
	| {
			status: "unchanged" | "synced";
			roleIds: bigint[];
			hasManageAccess: boolean;
			hasRoleAccess: boolean;
	  };

function hasManageAccessForGuild(
	permissionsNumber: number,
	owner: boolean,
): boolean {
	return (
		owner ||
		hasPermission(permissionsNumber, DISCORD_PERMISSIONS.ManageGuild) ||
		hasPermission(permissionsNumber, DISCORD_PERMISSIONS.Administrator)
	);
}

function hasInstalledBot(server: Doc<"servers"> | undefined): boolean {
	return (
		server !== undefined &&
		(server.kickedTime === null || server.kickedTime === undefined)
	);
}

async function syncDashboardAccessForGuild(
	ctx: Pick<ActionCtx, "runQuery" | "runMutation">,
	args: {
		backendAccessToken: string;
		discordAccountId: bigint;
		serverId: bigint;
		permissions: string;
		owner: boolean;
	},
): Promise<SyncedDashboardAccessState> {
	// Ensure owners always have the Administrator bit set, even if Discord's
	// API no longer includes it in the permissions field for owners.
	const rawPermissions = getDashboardPermissionMask(args.permissions);
	const permissionsNumber = args.owner
		? rawPermissions | DISCORD_PERMISSIONS.Administrator
		: rawPermissions;
	const hasManageAccess = hasManageAccessForGuild(
		permissionsNumber,
		args.owner,
	);

	const [existingSettings, serverPreferences, roleIds] = await Promise.all([
		ctx.runQuery(api.private.user_server_settings.findUserServerSettingsById, {
			backendAccessToken: args.backendAccessToken,
			userId: args.discordAccountId,
			serverId: args.serverId,
		}),
		ctx.runQuery(
			api.private.server_preferences.getServerPreferencesByServerId,
			{
				backendAccessToken: args.backendAccessToken,
				serverId: args.serverId,
			},
		),
		fetchGuildMemberRoleIdsWithBot(args.serverId, args.discordAccountId),
	]);

	if (!roleIds) {
		return {
			status: "member_not_found",
			roleIds: existingSettings?.roleIds ?? [],
			hasManageAccess,
			hasRoleAccess: false,
		};
	}

	const normalizedRoleIds = normalizeRoleIds(roleIds);
	const hasRoleAccess = hasDashboardRoleAccess(
		normalizedRoleIds,
		serverPreferences?.dashboardRoleIds,
	);

	if (
		existingSettings &&
		existingSettings.permissions === permissionsNumber &&
		haveSameRoleIds(existingSettings.roleIds, normalizedRoleIds)
	) {
		return {
			status: "unchanged",
			roleIds: normalizedRoleIds,
			hasManageAccess,
			hasRoleAccess,
		};
	}

	await ctx.runMutation(
		api.private.user_server_settings.upsertUserServerSettings,
		{
			backendAccessToken: args.backendAccessToken,
			settings: {
				serverId: args.serverId,
				userId: args.discordAccountId,
				permissions: permissionsNumber,
				roleIds: normalizedRoleIds,
				canPubliclyDisplayMessages:
					existingSettings?.canPubliclyDisplayMessages ?? false,
				messageIndexingDisabled:
					existingSettings?.messageIndexingDisabled ?? false,
				apiKey: existingSettings?.apiKey,
				apiCallsUsed: existingSettings?.apiCallsUsed ?? 0,
				botAddedTimestamp: existingSettings?.botAddedTimestamp,
			},
		},
	);

	return {
		status: "synced",
		roleIds: normalizedRoleIds,
		hasManageAccess,
		hasRoleAccess,
	};
}

type AnalyticsResult = Record<string, { aggregated_value: number }>;

export const fetchTopQuestionSolvers = internalAction({
	args: {
		serverId: v.string(),
	},
	handler: async (_ctx, args): Promise<AnalyticsResult> => {
		const program = Effect.gen(function* () {
			const analytics = yield* Analytics;
			return yield* analytics.server.getTopQuestionSolversForServer();
		});

		const result = await Effect.runPromise(
			program.pipe(
				Effect.provide(ServerAnalyticsLayer({ serverId: args.serverId })),
				Effect.timeout("30 seconds"),
				Effect.catchAll(() => Effect.succeed(null)),
			),
		);

		return result ?? {};
	},
});

export const fetchTopPages = internalAction({
	args: {
		serverId: v.string(),
	},
	handler: async (_ctx, args): Promise<AnalyticsResult> => {
		const program = Effect.gen(function* () {
			const analytics = yield* Analytics;
			return yield* analytics.server.getTopPages();
		});

		const result = await Effect.runPromise(
			program.pipe(
				Effect.provide(ServerAnalyticsLayer({ serverId: args.serverId })),
				Effect.timeout("30 seconds"),
				Effect.catchAll(() => Effect.succeed(null)),
			),
		);

		return result ?? {};
	},
});

const _getTopQuestionSolversCache = () =>
	new ActionCache(components.actionCache, {
		action: internal.authenticated.dashboard.fetchTopQuestionSolvers,
		name: "topQuestionSolvers",
		ttl: 3600 * 1000, // 1 hour - analytics data doesn't need real-time updates
	});

const _getTopPagesCache = () =>
	new ActionCache(components.actionCache, {
		action: internal.authenticated.dashboard.fetchTopPages,
		name: "topPages",
		ttl: 3600 * 1000, // 1 hour
	});

type ServerWithMetadata = {
	discordId: string;
	name: string;
	icon: string | null;
	owner: boolean;
	permissions: string;
	highestRole: "Manage Guild" | "Administrator" | "Owner" | "Dashboard Role";
	hasBot: boolean;
	aoServerId: Id<"servers"> | undefined;
};

export const getUserServers = authenticatedAction({
	args: {},
	handler: async (ctx, args): Promise<ServerWithMetadata[]> => {
		const { discordAccountId } = args;
		const backendAccessToken = getBackendAccessToken();

		const discordAccount = await getDiscordAccountWithToken(ctx);

		if (!discordAccount || discordAccount.accountId !== discordAccountId) {
			throw new Error("Discord account not linked or mismatch");
		}

		const discordGuilds = await getDiscordGuildsCache().fetch(ctx, {
			discordAccountId,
		});
		const serverDiscordIds = discordGuilds.map((guild) => BigInt(guild.id));
		const aoServers = await ctx.runQuery(
			api.private.servers.findManyServersByDiscordId,
			{
				discordIds: serverDiscordIds,
				backendAccessToken,
			},
		);

		const aoServersByDiscordId = new Map(
			aoServers.map((server) => [server.discordId.toString(), server]),
		);

		const syncedAccessByGuildId = new Map(
			await Promise.all(
				discordGuilds
					.filter((guild) =>
						hasInstalledBot(aoServersByDiscordId.get(guild.id)),
					)
					.map(
						async (guild) =>
							[
								guild.id,
								await syncDashboardAccessForGuild(ctx, {
									backendAccessToken,
									discordAccountId,
									serverId: BigInt(guild.id),
									permissions: guild.permissions,
									owner: guild.owner,
								}),
							] as const,
					),
			),
		);

		const serversWithMetadata: ServerWithMetadata[] = [];

		for (const guild of discordGuilds) {
			const permissions = BigInt(guild.permissions);
			const dashboardPermissionMask = getDashboardPermissionMask(
				guild.permissions,
			);
			const hasManageAccess = hasManageAccessForGuild(
				dashboardPermissionMask,
				guild.owner,
			);
			const syncedAccess = syncedAccessByGuildId.get(guild.id);
			const hasRoleAccess = syncedAccess?.hasRoleAccess ?? false;

			if (!hasManageAccess && !hasRoleAccess) {
				continue;
			}

			const aoServer = aoServersByDiscordId.get(guild.id);
			const highestRole = hasManageAccess
				? getHighestRoleFromPermissions(permissions, guild.owner)
				: "Dashboard Role";

			serversWithMetadata.push({
				discordId: guild.id,
				name: guild.name,
				icon: guild.icon ?? null,
				owner: guild.owner,
				permissions: guild.permissions,
				highestRole,
				hasBot: hasInstalledBot(aoServer),
				aoServerId: aoServer?._id,
			});
		}

		return sortServersByBotAndRole(serversWithMetadata);
	},
});

export const getDashboardRolesForServer = guildManagerAction({
	args: {},
	handler: async (_ctx, args) => {
		const roles = await fetchGuildRolesWithBot(args.serverId);
		return roles.map((role) => ({
			id: role.id,
			name: role.name,
			color: role.color,
			position: role.position,
			managed: role.managed,
		}));
	},
});

export const getTopQuestionSolversForServer = guildManagerAction({
	args: {
		from: v.optional(v.number()),
		to: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const program = Effect.gen(function* () {
			const analytics = yield* Analytics;
			return yield* analytics.server.getTopQuestionSolversForServer();
		});

		const analyticsData = await Effect.runPromise(
			program.pipe(
				Effect.provide(
					ServerAnalyticsLayer({
						serverId: args.serverId.toString(),
						from: args.from ? new Date(args.from) : undefined,
						to: args.to ? new Date(args.to) : undefined,
					}),
				),
				Effect.timeout("30 seconds"),
				Effect.catchAll(() => Effect.succeed(null)),
			),
		);

		if (!analyticsData || Object.keys(analyticsData).length === 0) return {};

		const userIds = Object.keys(analyticsData).map((id) => BigInt(id));

		const discordAccounts = await ctx.runQuery(
			api.private.discord_accounts.findManyDiscordAccountsByIds,
			{
				ids: userIds,
				backendAccessToken: getBackendAccessToken(),
			},
		);

		const accountMap = new Map(
			discordAccounts.map((a) => [a.id.toString(), a]),
		);

		const enrichedData: Record<
			string,
			{ aggregated_value: number; name: string; avatar: string | null }
		> = {};

		for (const [userId, data] of Object.entries(analyticsData)) {
			const account = accountMap.get(userId);
			enrichedData[userId] = {
				aggregated_value: data.aggregated_value,
				name: account?.name ?? userId,
				avatar: account?.avatar ?? null,
			};
		}

		return enrichedData;
	},
});

export const getPageViewsForServer = guildManagerAction({
	args: {
		from: v.optional(v.number()),
		to: v.optional(v.number()),
	},
	handler: async (_ctx, args) => {
		const program = Effect.gen(function* () {
			const analytics = yield* Analytics;
			return yield* analytics.server.getPageViewsForServer();
		}).pipe(
			Effect.provide(
				ServerAnalyticsLayer({
					serverId: args.serverId.toString(),
					from: args.from ? new Date(args.from) : undefined,
					to: args.to ? new Date(args.to) : undefined,
				}),
			),
		);

		return await Effect.runPromise(program);
	},
});

export const getServerInvitesClicked = guildManagerAction({
	args: {
		from: v.optional(v.number()),
		to: v.optional(v.number()),
	},
	handler: async (_ctx, args) => {
		const program = Effect.gen(function* () {
			const analytics = yield* Analytics;
			return yield* analytics.server.getServerInvitesClicked();
		}).pipe(
			Effect.provide(
				ServerAnalyticsLayer({
					serverId: args.serverId.toString(),
					from: args.from ? new Date(args.from) : undefined,
					to: args.to ? new Date(args.to) : undefined,
				}),
			),
		);

		return await Effect.runPromise(program);
	},
});

export const getQuestionsAndAnswers = guildManagerAction({
	args: {
		from: v.optional(v.number()),
		to: v.optional(v.number()),
	},
	handler: async (_ctx, args) => {
		const program = Effect.gen(function* () {
			const analytics = yield* Analytics;
			return yield* analytics.server.getQuestionsAndAnswers();
		}).pipe(
			Effect.provide(
				ServerAnalyticsLayer({
					serverId: args.serverId.toString(),
					from: args.from ? new Date(args.from) : undefined,
					to: args.to ? new Date(args.to) : undefined,
				}),
			),
		);

		return await Effect.runPromise(program);
	},
});

export const getTopPagesForServer = guildManagerAction({
	args: {
		from: v.optional(v.number()),
		to: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const program = Effect.gen(function* () {
			const analytics = yield* Analytics;
			return yield* analytics.server.getTopPages();
		});

		const analyticsData = await Effect.runPromise(
			program.pipe(
				Effect.provide(
					ServerAnalyticsLayer({
						serverId: args.serverId.toString(),
						from: args.from ? new Date(args.from) : undefined,
						to: args.to ? new Date(args.to) : undefined,
					}),
				),
				Effect.timeout("30 seconds"),
				Effect.catchAll(() => Effect.succeed(null)),
			),
		);

		if (!analyticsData || Object.keys(analyticsData).length === 0) return {};

		const messageIds = Object.keys(analyticsData).map((id) => BigInt(id));

		const channels = await ctx.runQuery(
			api.private.channels.findManyChannelsByDiscordIds,
			{
				discordIds: messageIds,
				backendAccessToken: getBackendAccessToken(),
			},
		);

		const channelMap = new Map(channels.map((c) => [c.id.toString(), c.name]));

		const enrichedData: Record<
			string,
			{ aggregated_value: number; name: string }
		> = {};

		for (const [messageId, data] of Object.entries(analyticsData)) {
			enrichedData[messageId] = {
				aggregated_value: data.aggregated_value,
				name: channelMap.get(messageId) ?? messageId,
			};
		}

		return enrichedData;
	},
});

export const trackBotAddClick = authenticatedAction({
	args: {
		serverId: v.int64(),
	},
	handler: async (ctx, args) => {
		const { discordAccountId } = args;
		const backendAccessToken = getBackendAccessToken();

		const discordGuilds = await getDiscordGuildsCache().fetch(ctx, {
			discordAccountId,
		});

		const targetGuild = discordGuilds.find(
			(guild) => guild.id === args.serverId.toString(),
		);

		if (!targetGuild) {
			throw new Error("Server not found in user's Discord guilds");
		}

		const permissions = BigInt(targetGuild.permissions);
		const hasManageGuild =
			targetGuild.owner ||
			hasPermission(permissions, DISCORD_PERMISSIONS.ManageGuild) ||
			hasPermission(permissions, DISCORD_PERMISSIONS.Administrator);

		if (!hasManageGuild) {
			throw new Error("User does not have Manage Guild permissions");
		}

		await ctx.runMutation(
			api.private.server_preferences.updateServerPreferences,
			{
				backendAccessToken,
				serverId: args.serverId,
				preferences: {
					addedByUserId: discordAccountId,
				},
			},
		);
	},
});

export const syncUserServerSettingsBackground = internalAction({
	args: {
		discordAccountId: v.int64(),
		manageableServers: v.array(
			v.object({
				id: v.int64(),
				permissions: v.string(),
			}),
		),
		aoServerIds: v.array(v.id("servers")),
	},
	handler: async (ctx, args): Promise<null> => {
		const { discordAccountId, manageableServers, aoServerIds } = args;
		const backendAccessToken = getBackendAccessToken();
		const aoServers = await ctx.runQuery(
			api.private.servers.findManyServersById,
			{
				ids: aoServerIds,
				backendAccessToken,
			},
		);

		const aoServersByDiscordId = new Map<bigint, Doc<"servers">>(
			aoServers.map((server) => [server.discordId, server]),
		);

		const serversToSync = manageableServers
			.map((guild) => {
				const aoServer = aoServersByDiscordId.get(guild.id);
				return aoServer ? { guild, aoServer } : null;
			})
			.filter(
				(
					item,
				): item is {
					guild: (typeof manageableServers)[0];
					aoServer: NonNullable<ReturnType<typeof aoServersByDiscordId.get>>;
				} => item !== null,
			);

		const existingSettingsArray = await ctx.runQuery(
			api.private.user_server_settings.findManyUserServerSettings,
			{
				backendAccessToken,
				settings: serversToSync.map(({ aoServer }) => ({
					userId: discordAccountId,
					serverId: aoServer.discordId,
				})),
			},
		);
		const existingSettingsByServerId = new Map(
			existingSettingsArray.map((settings) => [settings.serverId, settings]),
		);

		for (const { guild, aoServer } of serversToSync) {
			const permissionsNumber = getDashboardPermissionMask(guild.permissions);

			const existingSettings = existingSettingsByServerId.get(
				aoServer.discordId,
			);

			if (
				existingSettings &&
				existingSettings.permissions === permissionsNumber
			) {
				continue;
			}

			await ctx.runMutation(
				api.private.user_server_settings.upsertUserServerSettings,
				{
					backendAccessToken,
					settings: {
						serverId: aoServer.discordId,
						userId: discordAccountId,
						permissions: permissionsNumber, // Sync permissions from Discord API
						canPubliclyDisplayMessages:
							existingSettings?.canPubliclyDisplayMessages ?? false,
						messageIndexingDisabled:
							existingSettings?.messageIndexingDisabled ?? false,
						apiKey: existingSettings?.apiKey,
						apiCallsUsed: existingSettings?.apiCallsUsed ?? 0,
					},
				},
			);
		}
		return null;
	},
});
