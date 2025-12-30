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
import { authenticatedAction, internalAction } from "../client";
import { guildManagerAction } from "../client/guildManager";
import { getDiscordAccountWithToken, getTokenStatus } from "../shared/auth";
import {
	DISCORD_PERMISSIONS,
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

const discordApi = (token: string) =>
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
									`Bearer ${token}`,
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

async function fetchGuildsWithToken(token: string) {
	const program = Effect.gen(function* () {
		const client = yield* discordApi(token);
		return yield* client.listMyGuilds();
	});

	try {
		const guilds = await Effect.runPromise(program);
		return guilds.map((guild) => ({
			id: guild.id,
			name: guild.name,
			icon: guild.icon ?? null,
			owner: guild.owner,
			permissions: guild.permissions,
		}));
	} catch (error) {
		const errorInfo = extractDiscordErrorInfo(error);
		if (errorInfo.status) {
			const newError = new Error(
				`Discord API error (${errorInfo.status}): ${errorInfo.message ?? "Unknown error"}`,
			);
			(newError as Error & { discordStatus: number }).discordStatus =
				errorInfo.status;
			throw newError;
		}
		throw error;
	}
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

const getTopQuestionSolversCache = () =>
	new ActionCache(components.actionCache, {
		action: internal.authenticated.dashboard.fetchTopQuestionSolvers,
		name: "topQuestionSolvers",
		ttl: 3600 * 1000, // 1 hour - analytics data doesn't need real-time updates
	});

const getTopPagesCache = () =>
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
	highestRole: "Manage Guild" | "Administrator" | "Owner";
	hasBot: boolean;
	aoServerId: Id<"servers"> | undefined;
};

export const getUserServers = authenticatedAction({
	args: {},
	handler: async (ctx, args): Promise<ServerWithMetadata[]> => {
		const { discordAccountId } = args;

		const discordAccount = await getDiscordAccountWithToken(ctx);

		if (!discordAccount || discordAccount.accountId !== discordAccountId) {
			throw new Error("Discord account not linked or mismatch");
		}

		const discordGuilds = await getDiscordGuildsCache().fetch(ctx, {
			discordAccountId,
		});

		const manageableServers = discordGuilds.filter((guild) => {
			const permissions = BigInt(guild.permissions);
			return (
				guild.owner ||
				hasPermission(permissions, DISCORD_PERMISSIONS.ManageGuild) ||
				hasPermission(permissions, DISCORD_PERMISSIONS.Administrator)
			);
		});

		const serverDiscordIds = manageableServers.map((g) => BigInt(g.id));
		const aoServers = await ctx.runQuery(
			api.private.servers.findManyServersByDiscordId,
			{
				discordIds: serverDiscordIds,
				backendAccessToken: getBackendAccessToken(),
			},
		);

		await ctx.scheduler.runAfter(
			0,
			internal.authenticated.dashboard.syncUserServerSettingsBackground,
			{
				discordAccountId,
				manageableServers: manageableServers.map((guild) => ({
					id: BigInt(guild.id),
					permissions: guild.permissions,
				})),
				aoServerIds: aoServers.map((server) => server._id),
			},
		);

		const aoServersByDiscordId = new Map(
			aoServers.map((server) => [server.discordId.toString(), server]),
		);

		const serversWithMetadata: ServerWithMetadata[] = manageableServers.map(
			(guild) => {
				const aoServer = aoServersByDiscordId.get(guild.id);
				const permissions = BigInt(guild.permissions);

				const highestRole = getHighestRoleFromPermissions(
					permissions,
					guild.owner,
				);

				return {
					discordId: guild.id,
					name: guild.name,
					icon: guild.icon ?? null,
					owner: guild.owner,
					permissions: guild.permissions,
					highestRole,
					hasBot:
						aoServer !== null &&
						aoServer !== undefined &&
						(aoServer.kickedTime === null || aoServer.kickedTime === undefined),
					aoServerId: aoServer?._id,
				};
			},
		);

		return sortServersByBotAndRole(serversWithMetadata);
	},
});

export const getTopQuestionSolversForServer = guildManagerAction({
	args: {},
	handler: async (ctx, args) => {
		const analyticsData = await getTopQuestionSolversCache().fetch(ctx, {
			serverId: args.serverId.toString(),
		});

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
				ServerAnalyticsLayer({ serverId: args.serverId.toString() }),
			),
		);

		return await Effect.runPromise(program);
	},
});

export const getServerInvitesClicked = guildManagerAction({
	args: {},
	handler: async (_ctx, args) => {
		const program = Effect.gen(function* () {
			const analytics = yield* Analytics;
			return yield* analytics.server.getServerInvitesClicked();
		}).pipe(
			Effect.provide(
				ServerAnalyticsLayer({ serverId: args.serverId.toString() }),
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
				ServerAnalyticsLayer({ serverId: args.serverId.toString() }),
			),
		);

		return await Effect.runPromise(program);
	},
});

export const getTopPagesForServer = guildManagerAction({
	args: {},
	handler: async (ctx, args) => {
		const analyticsData = await getTopPagesCache().fetch(ctx, {
			serverId: args.serverId.toString(),
		});

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
			const permissionsNumber = Number(guild.permissions);

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
