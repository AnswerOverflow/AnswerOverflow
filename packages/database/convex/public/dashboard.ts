"use node";

import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
} from "@effect/platform";
import {
	Analytics,
	AnalyticsLayer,
	ServerAnalyticsLayer,
} from "@packages/analytics/server/index";
import { make } from "@packages/discord-api/generated";
import { v } from "convex/values";
import { Effect } from "effect";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import {
	authenticatedAction,
	getDiscordAccountWithToken,
} from "../shared/auth";
import { getOrSetCache } from "../shared/cache";
import {
	DISCORD_PERMISSIONS,
	getHighestRoleFromPermissions,
	hasPermission,
	sortServersByBotAndRole,
} from "../shared/shared";

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

		// Get Discord account with access token
		const discordAccount = await getDiscordAccountWithToken(ctx);
		if (!discordAccount || discordAccount.accountId !== discordAccountId) {
			throw new Error("Discord account not linked or mismatch");
		}

		const token = discordAccount.accessToken;

		// Fetch user's Discord servers using the API client
		// Cache the result for 5 minutes to reduce API calls
		const cacheKey = `discord:guilds:${discordAccountId}`;
		const client = await Effect.runPromise(discordApi(token));
		const cachedGuildsEffect = getOrSetCache(
			cacheKey,
			() => client.listMyGuilds(),
			300, // 5 minutes TTL
		);
		const discordGuilds = await Effect.runPromise(cachedGuildsEffect);

		// Filter to servers user can manage (ManageGuild, Administrator, or Owner)
		const manageableServers = discordGuilds.filter((guild) => {
			const permissions = BigInt(guild.permissions);
			return (
				guild.owner ||
				hasPermission(permissions, DISCORD_PERMISSIONS.ManageGuild) ||
				hasPermission(permissions, DISCORD_PERMISSIONS.Administrator)
			);
		});

		// Match with Answer Overflow servers
		const serverDiscordIds = manageableServers.map((g) => g.id);
		const aoServers = await Promise.all(
			serverDiscordIds.map((discordId) =>
				ctx.runQuery(api.public.servers.publicGetServerByDiscordId, {
					discordId,
				}),
			),
		);

		// Sync user server settings with permissions from Discord API
		// This ensures the reactive query has data to work with
		const backendAccessToken = process.env.BACKEND_ACCESS_TOKEN;
		if (!backendAccessToken) {
			throw new Error("BACKEND_ACCESS_TOKEN not configured");
		}

		await Promise.all(
			manageableServers.map(async (guild, idx) => {
				const aoServer = aoServers[idx];
				if (!aoServer) return; // Skip if server doesn't exist in AO

				// Convert permissions string to number (Discord API returns permissions as string)
				const permissionsNumber = Number(guild.permissions);

				// Get existing user server settings
				const existingSettings = await ctx.runQuery(
					api.publicInternal.user_server_settings.findUserServerSettingsById,
					{
						backendAccessToken,
						userId: discordAccountId,
						serverId: aoServer._id,
					},
				);

				// Prepare settings - preserve existing values or use defaults
				const settings = {
					serverId: aoServer._id,
					userId: discordAccountId,
					permissions: permissionsNumber, // Sync permissions from Discord API
					canPubliclyDisplayMessages:
						existingSettings?.canPubliclyDisplayMessages ?? false,
					messageIndexingDisabled:
						existingSettings?.messageIndexingDisabled ?? false,
					apiKey: existingSettings?.apiKey,
					apiCallsUsed: existingSettings?.apiCallsUsed ?? 0,
				};

				// Upsert user server settings with synced permissions
				// Use publicInternalMutation which requires backendAccessToken
				await ctx.runMutation(
					api.publicInternal.user_server_settings.upsertUserServerSettings,
					{ backendAccessToken, settings },
				);
			}),
		);

		// Combine Discord guild data with AO server data
		const serversWithMetadata: ServerWithMetadata[] = manageableServers.map(
			(guild, idx) => {
				const aoServer = aoServers[idx];
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

		// Sort: has bot + owner/admin/manage, then no bot + owner/admin/manage
		return sortServersByBotAndRole(serversWithMetadata);
	},
});

/**
 * Helper function to check if user has ManageGuild permission for a server
 * Uses the same permission check as getUserServers
 */
async function checkManageGuildPermission(
	ctx: ActionCtx,
	discordAccountId: string,
	serverId: Id<"servers">,
): Promise<void> {
	const backendAccessToken = process.env.BACKEND_ACCESS_TOKEN;
	if (!backendAccessToken) {
		throw new Error("BACKEND_ACCESS_TOKEN not configured");
	}

	// Get user server settings to check permissions
	const settings = await ctx.runQuery(
		api.publicInternal.user_server_settings.findUserServerSettingsById,
		{
			backendAccessToken,
			userId: discordAccountId,
			serverId,
		},
	);

	if (!settings) {
		throw new Error(
			"You are not a member of the server you are trying to view analytics for",
		);
	}

	// Check if user has Administrator or ManageGuild permission
	const hasAdminOrManageGuild =
		hasPermission(settings.permissions, DISCORD_PERMISSIONS.Administrator) ||
		hasPermission(settings.permissions, DISCORD_PERMISSIONS.ManageGuild);

	if (!hasAdminOrManageGuild) {
		throw new Error(
			"You are missing the required permissions (Manage Guild or Administrator) to view analytics for this server",
		);
	}
}

export const getTopQuestionSolversForServer = authenticatedAction({
	args: {
		serverId: v.id("servers"),
	},
	handler: async (ctx, args) => {
		const { discordAccountId, serverId } = args;

		// Check permissions
		await checkManageGuildPermission(ctx, discordAccountId, serverId);

		// Call analytics service
		const program = Effect.gen(function* () {
			const analytics = yield* Analytics;
			return yield* analytics.server.getTopQuestionSolversForServer();
		});

		return await Effect.runPromise(
			program.pipe(Effect.provide(AnalyticsLayer)),
		);
	},
});

export const getPageViewsForServer = authenticatedAction({
	args: {
		serverId: v.id("servers"),
		from: v.optional(v.number()),
		to: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { discordAccountId, serverId, from, to } = args;

		// Check permissions
		await checkManageGuildPermission(ctx, discordAccountId, serverId);

		// Call analytics service
		const program = Effect.gen(function* () {
			const analytics = yield* Analytics;
			return yield* analytics.server.getPageViewsForServer();
		}).pipe(Effect.provide(AnalyticsLayer));

		return await Effect.runPromise(program);
	},
});

export const getServerInvitesClicked = authenticatedAction({
	args: {
		serverId: v.id("servers"),
	},
	handler: async (ctx, args) => {
		const { discordAccountId, serverId } = args;

		// Check permissions
		await checkManageGuildPermission(ctx, discordAccountId, serverId);

		// Call analytics service
		const program = Effect.gen(function* () {
			const analytics = yield* Analytics;
			return yield* analytics.server.getServerInvitesClicked();
		}).pipe(Effect.provide(ServerAnalyticsLayer({ serverId })));

		return await Effect.runPromise(program);
	},
});

export const getQuestionsAndAnswers = authenticatedAction({
	args: {
		serverId: v.id("servers"),
		from: v.optional(v.number()),
		to: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { discordAccountId, serverId } = args;

		// Check permissions
		await checkManageGuildPermission(ctx, discordAccountId, serverId);

		const program = Effect.gen(function* () {
			const analytics = yield* Analytics;
			return yield* analytics.server.getQuestionsAndAnswers();
		}).pipe(Effect.provide(ServerAnalyticsLayer({ serverId })));

		return await Effect.runPromise(program);
	},
});

/**
 * Track when a user clicks the "Add to Server" button
 * Stores a timestamp on userServerSettings to track who initiated the bot addition
 */
export const trackBotAddClick = authenticatedAction({
	args: {
		serverDiscordId: v.string(),
	},
	handler: async (ctx, args) => {
		const { discordAccountId, serverDiscordId } = args;

		// Get the server by Discord ID
		const server = await ctx.runQuery(
			api.public.servers.publicGetServerByDiscordId,
			{
				discordId: serverDiscordId,
			},
		);

		if (!server) {
			// Server doesn't exist yet, that's okay - we'll create/update settings when it does
			// For now, just return without error
			return;
		}

		const backendAccessToken = process.env.BACKEND_ACCESS_TOKEN;
		if (!backendAccessToken) {
			throw new Error("BACKEND_ACCESS_TOKEN not configured");
		}

		// Get existing user server settings
		const existingSettings = await ctx.runQuery(
			api.publicInternal.user_server_settings.findUserServerSettingsById,
			{
				backendAccessToken,
				userId: discordAccountId,
				serverId: server._id,
			},
		);

		// Prepare settings - preserve existing values or use defaults
		// Only set botAddedTimestamp if it doesn't already exist (track first click)
		const settings = {
			serverId: server._id,
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

		// Upsert user server settings with botAddedTimestamp
		await ctx.runMutation(
			api.publicInternal.user_server_settings.upsertUserServerSettings,
			{ backendAccessToken, settings },
		);
	},
});
