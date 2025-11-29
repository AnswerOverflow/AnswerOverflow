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
import { Effect } from "effect";
import { api, components, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { authenticatedAction, internalAction } from "../client";
import { guildManagerAction, guildManagerQuery } from "../client/guildManager";
import { getDiscordAccountWithToken } from "../shared/auth";
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

		const token = discordAccount.accessToken;
		const client = await Effect.runPromise(discordApi(token));
		const guilds = await Effect.runPromise(client.listMyGuilds());

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

export const getTopQuestionSolversForServer = guildManagerQuery({
	args: {},
	handler: async (_ctx, args) => {
		const program = Effect.gen(function* () {
			const analytics = yield* Analytics;
			return yield* analytics.server.getTopQuestionSolversForServer();
		});

		return await Effect.runPromise(
			program.pipe(
				Effect.provide(
					ServerAnalyticsLayer({ serverId: args.serverId.toString() }),
				),
			),
		);
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
	returns: v.null(),
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
