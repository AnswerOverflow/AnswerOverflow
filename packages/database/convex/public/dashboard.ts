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
import { createConvexOtelLayer } from "@packages/observability/convex-effect-otel";
import { v } from "convex/values";
import { Effect, type Tracer } from "effect";
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

		const tracedEffect = Effect.gen(function* () {
			return yield* Effect.withSpan("dashboard.getUserServers")(
				Effect.gen(function* () {
					yield* Effect.annotateCurrentSpan({
						"discord.account.id": discordAccountId,
						"convex.function": "getUserServers",
					});

					// Get Discord account with access token
					const discordAccount = yield* Effect.withSpan(
						"dashboard.getUserServers.getDiscordAccount",
					)(
						Effect.gen(function* () {
							yield* Effect.annotateCurrentSpan({
								"discord.account.id": discordAccountId,
							});
							// Extract current span to pass as parent to getDiscordAccountWithToken
							// so the span created there inherits the trace context
							const currentSpan = yield* Effect.currentSpan;
							return yield* Effect.tryPromise({
								try: () =>
									getDiscordAccountWithToken(
										ctx,
										currentSpan ? (currentSpan as Tracer.AnySpan) : undefined,
									),
								catch: (error) => new Error(String(error)),
							});
						}),
					);

					if (
						!discordAccount ||
						discordAccount.accountId !== discordAccountId
					) {
						throw new Error("Discord account not linked or mismatch");
					}

					const token = discordAccount.accessToken;

					// Fetch user's Discord servers using the API client
					// Cache the result for 5 minutes to reduce API calls
					const cacheKey = `discord:guilds:${discordAccountId}`;
					const client = yield* Effect.withSpan(
						"dashboard.getUserServers.createDiscordClient",
					)(discordApi(token));

					const discordGuilds = yield* Effect.withSpan(
						"dashboard.getUserServers.fetchDiscordGuilds",
					)(
						Effect.gen(function* () {
							yield* Effect.annotateCurrentSpan({
								"cache.key": cacheKey,
							});
							return yield* getOrSetCache(
								cacheKey,
								() =>
									Effect.withSpan(
										"dashboard.getUserServers.fetchDiscordGuilds.discordApi",
									)(client.listMyGuilds()),
								300, // 5 minutes TTL
							);
						}),
					);

					// Filter to servers user can manage (ManageGuild, Administrator, or Owner)
					const manageableServers = yield* Effect.withSpan(
						"dashboard.getUserServers.filterManageableServers",
					)(
						Effect.gen(function* () {
							const filtered = discordGuilds.filter((guild) => {
								const permissions = BigInt(guild.permissions);
								return (
									guild.owner ||
									hasPermission(permissions, DISCORD_PERMISSIONS.ManageGuild) ||
									hasPermission(permissions, DISCORD_PERMISSIONS.Administrator)
								);
							});
							yield* Effect.annotateCurrentSpan({
								"guilds.total": discordGuilds.length,
								"guilds.manageable": filtered.length,
							});
							return filtered;
						}),
					);

					// Match with Answer Overflow servers
					const serverDiscordIds = manageableServers.map((g) => g.id);
					const aoServers = yield* Effect.withSpan(
						"dashboard.getUserServers.matchAOServers",
					)(
						Effect.gen(function* () {
							yield* Effect.annotateCurrentSpan({
								"servers.count": serverDiscordIds.length,
							});
							return yield* Effect.withSpan(
								"dashboard.getUserServers.matchAOServers.query",
							)(
								Effect.tryPromise({
									try: () =>
										ctx.runQuery(
											api.public.servers.publicFindManyServersByDiscordId,
											{ discordIds: serverDiscordIds },
										),
									catch: (error) => new Error(String(error)),
								}),
							);
						}),
					);

					// Create a map for quick lookup of servers by Discord ID
					const aoServersByDiscordId = new Map(
						aoServers.map((server) => [server.discordId, server]),
					);

					// Sync user server settings with permissions from Discord API
					// This ensures the reactive query has data to work with
					const backendAccessToken = process.env.BACKEND_ACCESS_TOKEN;
					if (!backendAccessToken) {
						throw new Error("BACKEND_ACCESS_TOKEN not configured");
					}

					yield* Effect.withSpan(
						"dashboard.getUserServers.syncUserServerSettings",
					)(
						Effect.gen(function* () {
							// Filter to only servers that exist in AO
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
										aoServer: NonNullable<
											ReturnType<typeof aoServersByDiscordId.get>
										>;
									} => item !== null,
								);

							yield* Effect.annotateCurrentSpan({
								"servers.toSync": serversToSync.length,
							});

							// Batch fetch all existing user server settings
							const existingSettingsArray = yield* Effect.withSpan(
								"dashboard.getUserServers.syncUserServerSettings.fetchExisting",
							)(
								Effect.tryPromise({
									try: () =>
										ctx.runQuery(
											api.publicInternal.user_server_settings
												.findManyUserServerSettings,
											{
												backendAccessToken,
												settings: serversToSync.map(({ aoServer }) => ({
													userId: discordAccountId,
													serverId: aoServer._id,
												})),
											},
										),
									catch: (error) => new Error(String(error)),
								}),
							);

							// Create a map for quick lookup of settings by server ID
							const existingSettingsByServerId = new Map(
								existingSettingsArray.map((settings) => [
									settings.serverId,
									settings,
								]),
							);

							// Upsert user server settings with synced permissions
							// Only update if permissions changed to avoid redundant mutations
							const settingsToUpdate: Array<{
								serverId: Id<"servers">;
								userId: string;
								permissions: number;
								canPubliclyDisplayMessages: boolean;
								messageIndexingDisabled: boolean;
								apiKey: string | undefined;
								apiCallsUsed: number;
							}> = [];

							for (const { guild, aoServer } of serversToSync) {
								// Convert permissions string to number (Discord API returns permissions as string)
								const permissionsNumber = Number(guild.permissions);

								// Get existing user server settings from the map
								const existingSettings = existingSettingsByServerId.get(
									aoServer._id,
								);

								// Skip if permissions haven't changed
								if (
									existingSettings &&
									existingSettings.permissions === permissionsNumber
								) {
									continue;
								}

								// Prepare settings - preserve existing values or use defaults
								settingsToUpdate.push({
									serverId: aoServer._id,
									userId: discordAccountId,
									permissions: permissionsNumber, // Sync permissions from Discord API
									canPubliclyDisplayMessages:
										existingSettings?.canPubliclyDisplayMessages ?? false,
									messageIndexingDisabled:
										existingSettings?.messageIndexingDisabled ?? false,
									apiKey: existingSettings?.apiKey,
									apiCallsUsed: existingSettings?.apiCallsUsed ?? 0,
								});
							}

							// Only run mutations for settings that actually need updating
							if (settingsToUpdate.length > 0) {
								yield* Effect.annotateCurrentSpan({
									"mutations.count": settingsToUpdate.length,
								});
								return yield* Effect.withSpan(
									"dashboard.getUserServers.syncUserServerSettings.runMutations",
								)(
									Effect.all(
										settingsToUpdate.map((settings, index) =>
											Effect.withSpan(
												`dashboard.getUserServers.syncUserServerSettings.mutation.${index}`,
											)(
												Effect.tryPromise({
													try: () =>
														ctx.runMutation(
															api.publicInternal.user_server_settings
																.upsertUserServerSettings,
															{ backendAccessToken, settings },
														),
													catch: (error) => new Error(String(error)),
												}),
											),
										),
									),
								);
							}

							return [];
						}),
					);

					// Combine Discord guild data with AO server data
					const serversWithMetadata: ServerWithMetadata[] =
						yield* Effect.withSpan(
							"dashboard.getUserServers.combineServerData",
						)(
							Effect.gen(function* () {
								const combined = manageableServers.map((guild) => {
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
											(aoServer.kickedTime === null ||
												aoServer.kickedTime === undefined),
										aoServerId: aoServer?._id,
									};
								});
								yield* Effect.annotateCurrentSpan({
									"servers.combined": combined.length,
								});
								return combined;
							}),
						);

					// Sort: has bot + owner/admin/manage, then no bot + owner/admin/manage
					return yield* Effect.withSpan("dashboard.getUserServers.sortServers")(
						Effect.succeed(sortServersByBotAndRole(serversWithMetadata)),
					);
				}),
			);
		});

		return await Effect.provide(
			tracedEffect,
			createConvexOtelLayer("database"),
		).pipe(Effect.runPromise);
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
		const { discordAccountId, serverId } = args;

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
