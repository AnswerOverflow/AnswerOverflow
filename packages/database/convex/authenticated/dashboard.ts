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
import { Cause, Effect } from "effect";
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

export const fetchDiscordGuilds = internalAction({
	args: {
		discordAccountId: v.int64(),
	},
	handler: async (ctx, args) => {
		const { discordAccountId } = args;

		const discordAccount = await getDiscordAccountWithToken(ctx);

		if (!discordAccount || discordAccount.accountId !== discordAccountId) {
			throw new Error("Discord account not linked or mismatch");
		}

		const tokenStatus = getTokenStatus(discordAccount.accessTokenExpiresAt);

		let token = discordAccount.accessToken;

		if (tokenStatus === "expired") {
			const refreshResult = await ctx.runAction(
				internal.authenticated.discord_token.refreshAndGetValidToken,
				{},
			);

			if (!refreshResult.success) {
				throw new Error(
					`Discord token refresh failed: ${refreshResult.error} (code: ${refreshResult.code})`,
				);
			}

			token = refreshResult.accessToken;
		}

		const program = Effect.gen(function* () {
			const client = yield* discordApi(token);
			return yield* client.listMyGuilds();
		}).pipe(
			Effect.catchAll((error) => {
				console.error(
					"Discord API error:",
					JSON.stringify(Cause.pretty(Cause.fail(error))),
				);
				return Effect.fail(
					new Error(`Discord API error: ${JSON.stringify(error)}`),
				);
			}),
		);

		const guilds = await Effect.runPromise(program);

		return guilds.map((guild) => ({
			id: guild.id,
			name: guild.name,
			icon: guild.icon ?? null,
			owner: guild.owner,
			permissions: guild.permissions,
		}));
	},
});

const discordGuildsCache = new ActionCache(components.actionCache, {
	action: internal.authenticated.dashboard.fetchDiscordGuilds,
	name: "discordGuilds",
	ttl: 300 * 1000, // 5 minutes in milliseconds
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

		const discordGuilds = await discordGuildsCache.fetch(ctx, {
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
		const program = Effect.gen(function* () {
			const analytics = yield* Analytics;
			return yield* analytics.server.getTopQuestionSolversForServer();
		});

		const analyticsData = await Effect.runPromise(
			program.pipe(
				Effect.provide(
					ServerAnalyticsLayer({ serverId: args.serverId.toString() }),
				),
			),
		);

		if (!analyticsData) return {};

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
		const program = Effect.gen(function* () {
			const analytics = yield* Analytics;
			return yield* analytics.server.getTopPages();
		}).pipe(
			Effect.provide(
				ServerAnalyticsLayer({ serverId: args.serverId.toString() }),
			),
		);

		const analyticsData = await Effect.runPromise(program);

		if (!analyticsData) return {};

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

export const trackBotAddClick = guildManagerAction({
	args: {},
	handler: async (ctx, args) => {
		const { discordAccountId } = args;
		const backendAccessToken = getBackendAccessToken();

		const existingSettings = await ctx.runQuery(
			api.private.user_server_settings.findUserServerSettingsById,
			{
				backendAccessToken,
				userId: discordAccountId,
				serverId: args.serverId,
			},
		);

		const settings = {
			serverId: args.serverId,
			userId: discordAccountId,
			permissions: existingSettings?.permissions ?? 0,
			canPubliclyDisplayMessages:
				existingSettings?.canPubliclyDisplayMessages ?? false,
			messageIndexingDisabled:
				existingSettings?.messageIndexingDisabled ?? false,
			apiKey: existingSettings?.apiKey,
			apiCallsUsed: existingSettings?.apiCallsUsed ?? 0,
			botAddedTimestamp: existingSettings?.botAddedTimestamp ?? Date.now(), // Set timestamp when button was clicked (only if not already set)
		};

		await ctx.runMutation(
			api.private.user_server_settings.upsertUserServerSettings,
			{ backendAccessToken, settings },
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
