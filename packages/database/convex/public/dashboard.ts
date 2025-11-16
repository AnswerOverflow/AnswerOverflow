import { ActionCache } from "@convex-dev/action-cache";
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
import { api, components, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { type ActionCtx, authenticatedAction, internalAction } from "../client";
import { getDiscordAccountWithToken } from "../shared/auth";
import {
	DISCORD_PERMISSIONS,
	getHighestRoleFromPermissions,
	hasPermission,
	sortServersByBotAndRole,
} from "../shared/shared";

function getBackendAccessToken(): string {
	const token = process.env.BACKEND_ACCESS_TOKEN;
	if (!token) {
		throw new Error("BACKEND_ACCESS_TOKEN not configured");
	}
	return token;
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
		discordAccountId: v.string(),
	},
	handler: async (ctx, args) => {
		const { discordAccountId } = args;

		const tracedEffect = Effect.gen(function* () {
			return yield* Effect.withSpan("dashboard.fetchDiscordGuilds")(
				Effect.gen(function* () {
					yield* Effect.annotateCurrentSpan({
						"discord.account.id": discordAccountId,
						"convex.function": "fetchDiscordGuilds",
					});

					const currentSpan = yield* Effect.currentSpan;
					const discordAccount = yield* Effect.tryPromise({
						try: () =>
							getDiscordAccountWithToken(
								ctx,
								currentSpan ? (currentSpan as Tracer.AnySpan) : undefined,
							),
						catch: (error) => new Error(String(error)),
					});

					if (
						!discordAccount ||
						discordAccount.accountId !== discordAccountId
					) {
						throw new Error("Discord account not linked or mismatch");
					}

					const token = discordAccount.accessToken;
					const client = yield* discordApi(token);

					const guilds = yield* Effect.withSpan(
						"dashboard.fetchDiscordGuilds.discordApi",
					)(client.listMyGuilds());

					return guilds.map((guild) => ({
						id: guild.id,
						name: guild.name,
						icon: guild.icon ?? null,
						owner: guild.owner,
						permissions: guild.permissions,
					}));
				}),
			);
		});

		return await Effect.provide(
			tracedEffect,
			createConvexOtelLayer("database"),
		).pipe(Effect.runPromise);
	},
});

const discordGuildsCache = new ActionCache(components.actionCache, {
	action: internal.public.dashboard.fetchDiscordGuilds,
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

		const tracedEffect = Effect.gen(function* () {
			return yield* Effect.withSpan("dashboard.getUserServers")(
				Effect.gen(function* () {
					yield* Effect.annotateCurrentSpan({
						"discord.account.id": discordAccountId,
						"convex.function": "getUserServers",
					});

					const discordAccount = yield* Effect.withSpan(
						"dashboard.getUserServers.getDiscordAccount",
					)(
						Effect.gen(function* () {
							yield* Effect.annotateCurrentSpan({
								"discord.account.id": discordAccountId,
							});
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

					const discordGuilds = yield* Effect.withSpan(
						"dashboard.getUserServers.fetchDiscordGuilds",
					)(
						Effect.tryPromise({
							try: () =>
								discordGuildsCache.fetch(ctx, {
									discordAccountId,
								}),
							catch: (error) => new Error(String(error)),
						}),
					);

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

					yield* Effect.withSpan(
						"dashboard.getUserServers.scheduleBackgroundSync",
					)(
						Effect.tryPromise({
							try: () => {
								return ctx.scheduler.runAfter(
									0,
									internal.public.dashboard.syncUserServerSettingsBackground,
									{
										discordAccountId,
										manageableServers: manageableServers.map((guild) => ({
											id: guild.id,
											permissions: guild.permissions,
										})),
										aoServerIds: aoServers.map((server) => server._id),
									},
								);
							},
							catch: (error) => new Error(String(error)),
						}),
					);

					const aoServersByDiscordId = new Map(
						aoServers.map((server) => [server.discordId, server]),
					);

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

async function checkManageGuildPermission(
	ctx: ActionCtx,
	discordAccountId: string,
	serverId: Id<"servers">,
): Promise<void> {
	const backendAccessToken = getBackendAccessToken();

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

		await checkManageGuildPermission(ctx, discordAccountId, serverId);

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

		await checkManageGuildPermission(ctx, discordAccountId, serverId);

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

		await checkManageGuildPermission(ctx, discordAccountId, serverId);

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

		await checkManageGuildPermission(ctx, discordAccountId, serverId);

		const program = Effect.gen(function* () {
			const analytics = yield* Analytics;
			return yield* analytics.server.getQuestionsAndAnswers();
		}).pipe(Effect.provide(ServerAnalyticsLayer({ serverId })));

		return await Effect.runPromise(program);
	},
});

export const trackBotAddClick = authenticatedAction({
	args: {
		serverDiscordId: v.string(),
	},
	handler: async (ctx, args) => {
		const { discordAccountId, serverDiscordId } = args;

		const server = await ctx.runQuery(
			api.public.servers.publicGetServerByDiscordId,
			{
				discordId: serverDiscordId,
			},
		);

		if (!server) {
			return;
		}

		const backendAccessToken = getBackendAccessToken();

		const existingSettings = await ctx.runQuery(
			api.publicInternal.user_server_settings.findUserServerSettingsById,
			{
				backendAccessToken,
				userId: discordAccountId,
				serverId: server._id,
			},
		);

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

		await ctx.runMutation(
			api.publicInternal.user_server_settings.upsertUserServerSettings,
			{ backendAccessToken, settings },
		);
	},
});

export const syncUserServerSettingsBackground = internalAction({
	args: {
		discordAccountId: v.string(),
		manageableServers: v.array(
			v.object({
				id: v.string(),
				permissions: v.string(),
			}),
		),
		aoServerIds: v.array(v.id("servers")),
	},
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		const { discordAccountId, manageableServers, aoServerIds } = args;

		const tracedEffect = Effect.gen(function* () {
			return yield* Effect.withSpan(
				"dashboard.syncUserServerSettingsBackground",
			)(
				Effect.gen(function* () {
					yield* Effect.annotateCurrentSpan({
						"discord.account.id": discordAccountId,
						"convex.function": "syncUserServerSettingsBackground",
						"servers.count": manageableServers.length,
					});

					const backendAccessToken = getBackendAccessToken();

					const aoServers: Array<Doc<"servers">> = yield* Effect.withSpan(
						"dashboard.syncUserServerSettingsBackground.fetchAOServers",
					)(
						Effect.tryPromise({
							try: () =>
								ctx.runQuery(api.public.servers.publicFindManyServersById, {
									ids: aoServerIds,
								}) as Promise<Array<Doc<"servers">>>,
							catch: (error) => new Error(String(error)),
						}),
					);

					const aoServersByDiscordId = new Map<string, Doc<"servers">>(
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
								aoServer: NonNullable<
									ReturnType<typeof aoServersByDiscordId.get>
								>;
							} => item !== null,
						);

					if (serversToSync.length === 0) {
						yield* Effect.annotateCurrentSpan({
							"servers.toSync": 0,
						});
						return;
					}

					yield* Effect.annotateCurrentSpan({
						"servers.toSync": serversToSync.length,
					});

					type UserServerSettings = {
						serverId: Id<"servers">;
						userId: string;
						permissions: number;
						canPubliclyDisplayMessages: boolean;
						messageIndexingDisabled: boolean;
						apiKey: string | undefined;
						apiCallsUsed: number;
					};
					const existingSettingsArray: Array<UserServerSettings> =
						yield* Effect.withSpan(
							"dashboard.syncUserServerSettingsBackground.fetchExisting",
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
									) as Promise<Array<UserServerSettings>>,
								catch: (error) => new Error(String(error)),
							}),
						);

					const existingSettingsByServerId = new Map<
						Id<"servers">,
						UserServerSettings
					>(
						existingSettingsArray.map((settings) => [
							settings.serverId,
							settings,
						]),
					);

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
						const permissionsNumber = Number(guild.permissions);

						const existingSettings = existingSettingsByServerId.get(
							aoServer._id,
						);

						if (
							existingSettings &&
							existingSettings.permissions === permissionsNumber
						) {
							continue;
						}

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

					if (settingsToUpdate.length > 0) {
						yield* Effect.annotateCurrentSpan({
							"mutations.count": settingsToUpdate.length,
						});
						yield* Effect.withSpan(
							"dashboard.syncUserServerSettingsBackground.runMutations",
						)(
							Effect.all(
								settingsToUpdate.map(
									(settings, index): Effect.Effect<void, Error, never> =>
										Effect.withSpan(
											`dashboard.syncUserServerSettingsBackground.mutation.${index}`,
										)(
											Effect.tryPromise({
												try: () =>
													ctx
														.runMutation(
															api.publicInternal.user_server_settings
																.upsertUserServerSettings,
															{ backendAccessToken, settings },
														)
														.then(() => undefined),
												catch: (error) => new Error(String(error)),
											}),
										),
								),
							),
						);
					}

					return undefined;
				}),
			);
		});

		await Effect.provide(tracedEffect, createConvexOtelLayer("database")).pipe(
			Effect.runPromise,
		);

		return null;
	},
});
