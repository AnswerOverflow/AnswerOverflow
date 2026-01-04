import { it } from "@effect/vitest";
import { Effect } from "effect";
import { describe, expect } from "vitest";
import { api } from "./_generated/api";
import { ConvexClientTest } from "../src/convex-client-test";
import { Database } from "../src/database";
import { DatabaseTestLayer } from "../src/database-test";
import {
	createAuthor,
	createChannel,
	createServer,
	enableChannelIndexing,
	makeMessagesPublic,
} from "../src/test/fixtures";

const ADMINISTRATOR = 0x8;
const MANAGE_GUILD = 0x20;
const SEND_MESSAGES = 0x800;

describe("Security", () => {
	describe("Private API - Backend Access Token", () => {
		it.scoped("should reject requests with empty backend token", () =>
			Effect.gen(function* () {
				const convexClient = yield* ConvexClientTest;
				const { client } = convexClient;

				const result = yield* Effect.tryPromise({
					try: () =>
						client.query(api.private.servers.findManyServersByDiscordId, {
							backendAccessToken: "",
							discordIds: [123n],
						}),
					catch: (e) => e,
				}).pipe(Effect.flip);

				expect(result).toBeDefined();
				expect(String(result)).toContain("Invalid BACKEND_ACCESS_TOKEN");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should reject requests with wrong backend token", () =>
			Effect.gen(function* () {
				const convexClient = yield* ConvexClientTest;
				const { client } = convexClient;

				const result = yield* Effect.tryPromise({
					try: () =>
						client.query(api.private.servers.findManyServersByDiscordId, {
							backendAccessToken: "wrong-token-12345",
							discordIds: [123n],
						}),
					catch: (e) => e,
				}).pipe(Effect.flip);

				expect(result).toBeDefined();
				expect(String(result)).toContain("Invalid BACKEND_ACCESS_TOKEN");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should accept requests with valid backend token", () =>
			Effect.gen(function* () {
				const convexClient = yield* ConvexClientTest;
				const { client } = convexClient;

				const result = yield* Effect.tryPromise(() =>
					client.query(api.private.servers.findManyServersByDiscordId, {
						backendAccessToken: "test-backend-access-token",
						discordIds: [123n],
					}),
				);

				expect(result).toEqual([]);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should reject mutation with invalid backend token", () =>
			Effect.gen(function* () {
				const convexClient = yield* ConvexClientTest;
				const { client } = convexClient;

				const result = yield* Effect.tryPromise({
					try: () =>
						client.mutation(api.private.servers.upsertServer, {
							backendAccessToken: "invalid-token",
							discordId: 123n,
							name: "Test Server",
							approximateMemberCount: 100,
						}),
					catch: (e) => e,
				}).pipe(Effect.flip);

				expect(result).toBeDefined();
				expect(String(result)).toContain("Invalid BACKEND_ACCESS_TOKEN");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should accept mutation with valid backend token", () =>
			Effect.gen(function* () {
				const convexClient = yield* ConvexClientTest;
				const { client } = convexClient;

				const result = yield* Effect.tryPromise(() =>
					client.mutation(api.private.servers.upsertServer, {
						backendAccessToken: "test-backend-access-token",
						discordId: 12345n,
						name: "Test Server",
						approximateMemberCount: 100,
					}),
				);

				expect(result).toBeDefined();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("Guild Manager Permissions", () => {
		it.scoped("should reject user without any server settings", () =>
			Effect.gen(function* () {
				const convexClient = yield* ConvexClientTest;
				const { client } = convexClient;
				const server = yield* createServer();
				const user = yield* createAuthor();

				const result = yield* Effect.tryPromise({
					try: () =>
						client.mutation(
							api.authenticated.dashboard_mutations
								.updateServerPreferencesFlags,
							{
								backendAccessToken: "test-backend-access-token",
								discordAccountId: user.id,
								serverId: server.discordId,
								flags: {
									considerAllMessagesPublicEnabled: true,
								},
							},
						),
					catch: (e) => e,
				}).pipe(Effect.flip);

				expect(result).toBeDefined();
				expect(String(result)).toContain("not a member");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should reject user with insufficient permissions (only SEND_MESSAGES)",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const convexClient = yield* ConvexClientTest;
					const { client } = convexClient;
					const server = yield* createServer();
					const user = yield* createAuthor();

					yield* database.private.user_server_settings.upsertUserServerSettings(
						{
							settings: {
								userId: user.id,
								serverId: server.discordId,
								permissions: SEND_MESSAGES,
								canPubliclyDisplayMessages: false,
								messageIndexingDisabled: false,
								apiCallsUsed: 0,
							},
						},
					);

					const result = yield* Effect.tryPromise({
						try: () =>
							client.mutation(
								api.authenticated.dashboard_mutations
									.updateServerPreferencesFlags,
								{
									backendAccessToken: "test-backend-access-token",
									discordAccountId: user.id,
									serverId: server.discordId,
									flags: {
										considerAllMessagesPublicEnabled: true,
									},
								},
							),
						catch: (e) => e,
					}).pipe(Effect.flip);

					expect(result).toBeDefined();
					expect(String(result)).toContain("Insufficient permissions");
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should allow user with MANAGE_GUILD permission", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const convexClient = yield* ConvexClientTest;
				const { client } = convexClient;
				const server = yield* createServer();
				const user = yield* createAuthor();

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: user.id,
						serverId: server.discordId,
						permissions: MANAGE_GUILD,
						canPubliclyDisplayMessages: false,
						messageIndexingDisabled: false,
						apiCallsUsed: 0,
					},
				});

				const result = yield* Effect.tryPromise(() =>
					client.mutation(
						api.authenticated.dashboard_mutations.updateServerPreferencesFlags,
						{
							backendAccessToken: "test-backend-access-token",
							discordAccountId: user.id,
							serverId: server.discordId,
							flags: {
								considerAllMessagesPublicEnabled: true,
							},
						},
					),
				);

				expect(result).toBeDefined();
				expect(result.considerAllMessagesPublicEnabled).toBe(true);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should allow user with ADMINISTRATOR permission", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const convexClient = yield* ConvexClientTest;
				const { client } = convexClient;
				const server = yield* createServer();
				const user = yield* createAuthor();

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: user.id,
						serverId: server.discordId,
						permissions: ADMINISTRATOR,
						canPubliclyDisplayMessages: false,
						messageIndexingDisabled: false,
						apiCallsUsed: 0,
					},
				});

				const result = yield* Effect.tryPromise(() =>
					client.mutation(
						api.authenticated.dashboard_mutations.updateServerPreferencesFlags,
						{
							backendAccessToken: "test-backend-access-token",
							discordAccountId: user.id,
							serverId: server.discordId,
							flags: {
								anonymizeMessagesEnabled: true,
							},
						},
					),
				);

				expect(result).toBeDefined();
				expect(result.anonymizeMessagesEnabled).toBe(true);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should reject user trying to modify channel settings for server they don't manage",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const convexClient = yield* ConvexClientTest;
					const { client } = convexClient;
					const server1 = yield* createServer();
					const server2 = yield* createServer();
					const channel = yield* createChannel(server2.discordId, { type: 0 });
					const user = yield* createAuthor();

					yield* database.private.user_server_settings.upsertUserServerSettings(
						{
							settings: {
								userId: user.id,
								serverId: server1.discordId,
								permissions: ADMINISTRATOR,
								canPubliclyDisplayMessages: false,
								messageIndexingDisabled: false,
								apiCallsUsed: 0,
							},
						},
					);

					const result = yield* Effect.tryPromise({
						try: () =>
							client.mutation(
								api.authenticated.dashboard_mutations
									.updateChannelSettingsFlags,
								{
									backendAccessToken: "test-backend-access-token",
									discordAccountId: user.id,
									serverId: server2.discordId,
									channelId: channel.id,
									flags: {
										indexingEnabled: true,
									},
								},
							),
						catch: (e) => e,
					}).pipe(Effect.flip);

					expect(result).toBeDefined();
					expect(String(result)).toContain("not a member");
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("Superuser Bypass", () => {
		const SUPER_USER_ID = BigInt("523949187663134754");

		it.scoped(
			"should allow superuser to access server without user_server_settings",
			() =>
				Effect.gen(function* () {
					const convexClient = yield* ConvexClientTest;
					const { client } = convexClient;
					const server = yield* createServer();

					const result = yield* Effect.tryPromise(() =>
						client.mutation(
							api.authenticated.dashboard_mutations
								.updateServerPreferencesFlags,
							{
								backendAccessToken: "test-backend-access-token",
								discordAccountId: SUPER_USER_ID,
								serverId: server.discordId,
								flags: {
									considerAllMessagesPublicEnabled: true,
								},
							},
						),
					);

					expect(result).toBeDefined();
					expect(result.considerAllMessagesPublicEnabled).toBe(true);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("Cross-Server Data Isolation", () => {
		it.scoped(
			"should not leak channels from one server when querying another",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const server1 = yield* createServer();
					const server2 = yield* createServer();
					const channel1 = yield* createChannel(server1.discordId, {
						type: 15,
					});

					yield* enableChannelIndexing(channel1.id);

					const server2Channels =
						yield* database.public.servers.getServerByDiscordIdWithChannels(
							{ discordId: server2.discordId },
							{ subscribe: false },
						);

					expect(server2Channels?.channels ?? []).toHaveLength(0);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should not return messages from other servers in channel query",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const server1 = yield* createServer();
					const server2 = yield* createServer();
					const channel1 = yield* createChannel(server1.discordId, { type: 0 });
					const channel2 = yield* createChannel(server2.discordId, { type: 0 });
					const author = yield* createAuthor();

					yield* enableChannelIndexing(channel1.id);
					yield* enableChannelIndexing(channel2.id);
					yield* makeMessagesPublic(server1.discordId);
					yield* makeMessagesPublic(server2.discordId);

					yield* database.private.messages.upsertMessage({
						message: {
							id: 1000000000000000001n,
							authorId: author.id,
							serverId: server1.discordId,
							channelId: channel1.id,
							content: "Server 1 message",
						},
					});

					yield* database.private.messages.upsertMessage({
						message: {
							id: 1000000000000000002n,
							authorId: author.id,
							serverId: server2.discordId,
							channelId: channel2.id,
							content: "Server 2 message",
						},
					});

					const result = yield* database.public.messages.getMessages(
						{
							channelId: channel1.id,
							after: 1000000000000000000n,
							paginationOpts: { numItems: 10, cursor: null },
						},
						{ subscribe: false },
					);

					expect(result.page).toHaveLength(1);
					expect(result.page[0]?.message.content).toBe("Server 1 message");
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("Plan-Gated Features", () => {
		it.scoped("should reject bot customization for FREE plan", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const convexClient = yield* ConvexClientTest;
				const { client } = convexClient;
				const server = yield* createServer();
				const user = yield* createAuthor();

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: user.id,
						serverId: server.discordId,
						permissions: ADMINISTRATOR,
						canPubliclyDisplayMessages: false,
						messageIndexingDisabled: false,
						apiCallsUsed: 0,
					},
				});

				yield* database.private.server_preferences.upsertServerPreferences({
					serverId: server.discordId,
					plan: "FREE",
				});

				const result = yield* Effect.tryPromise({
					try: () =>
						client.mutation(
							api.authenticated.dashboard_mutations.updateBotCustomization,
							{
								backendAccessToken: "test-backend-access-token",
								discordAccountId: user.id,
								serverId: server.discordId,
								botNickname: "Custom Bot Name",
							},
						),
					catch: (e) => e,
				}).pipe(Effect.flip);

				expect(result).toBeDefined();
				expect(String(result)).toContain("Advanced plan or higher");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should allow bot customization for ADVANCED plan", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const convexClient = yield* ConvexClientTest;
				const { client } = convexClient;
				const server = yield* createServer();
				const user = yield* createAuthor();

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: user.id,
						serverId: server.discordId,
						permissions: ADMINISTRATOR,
						canPubliclyDisplayMessages: false,
						messageIndexingDisabled: false,
						apiCallsUsed: 0,
					},
				});

				yield* database.private.server_preferences.upsertServerPreferences({
					serverId: server.discordId,
					plan: "ADVANCED",
				});

				const result = yield* Effect.tryPromise(() =>
					client.mutation(
						api.authenticated.dashboard_mutations.updateBotCustomization,
						{
							backendAccessToken: "test-backend-access-token",
							discordAccountId: user.id,
							serverId: server.discordId,
							botNickname: "Custom Bot Name",
						},
					),
				);

				expect(result).toBeDefined();
				expect(result.botNickname).toBe("Custom Bot Name");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("Input Validation", () => {
		it.scoped("should reject solution tag on non-forum channel", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const convexClient = yield* ConvexClientTest;
				const { client } = convexClient;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId, {
					type: 0,
				});
				const user = yield* createAuthor();

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: user.id,
						serverId: server.discordId,
						permissions: ADMINISTRATOR,
						canPubliclyDisplayMessages: false,
						messageIndexingDisabled: false,
						apiCallsUsed: 0,
					},
				});

				const result = yield* Effect.tryPromise({
					try: () =>
						client.mutation(
							api.authenticated.dashboard_mutations.updateChannelSolutionTag,
							{
								backendAccessToken: "test-backend-access-token",
								discordAccountId: user.id,
								serverId: server.discordId,
								channelId: channel.id,
								solutionTagId: 123n,
							},
						),
					catch: (e) => e,
				}).pipe(Effect.flip);

				expect(result).toBeDefined();
				expect(String(result)).toContain("forum channels");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should reject solution tag that doesn't exist on forum channel",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;
					const convexClient = yield* ConvexClientTest;
					const { client } = convexClient;
					const server = yield* createServer();
					const channel = yield* createChannel(server.discordId, {
						type: 15,
					});
					const user = yield* createAuthor();

					yield* database.private.user_server_settings.upsertUserServerSettings(
						{
							settings: {
								userId: user.id,
								serverId: server.discordId,
								permissions: ADMINISTRATOR,
								canPubliclyDisplayMessages: false,
								messageIndexingDisabled: false,
								apiCallsUsed: 0,
							},
						},
					);

					const result = yield* Effect.tryPromise({
						try: () =>
							client.mutation(
								api.authenticated.dashboard_mutations.updateChannelSolutionTag,
								{
									backendAccessToken: "test-backend-access-token",
									discordAccountId: user.id,
									serverId: server.discordId,
									channelId: channel.id,
									solutionTagId: 999999999999n,
								},
							),
						catch: (e) => e,
					}).pipe(Effect.flip);

					expect(result).toBeDefined();
					expect(String(result)).toContain("does not exist");
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should allow null solution tag to clear it", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const convexClient = yield* ConvexClientTest;
				const { client } = convexClient;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId, {
					type: 15,
				});
				const user = yield* createAuthor();

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: user.id,
						serverId: server.discordId,
						permissions: ADMINISTRATOR,
						canPubliclyDisplayMessages: false,
						messageIndexingDisabled: false,
						apiCallsUsed: 0,
					},
				});

				const result = yield* Effect.tryPromise(() =>
					client.mutation(
						api.authenticated.dashboard_mutations.updateChannelSolutionTag,
						{
							backendAccessToken: "test-backend-access-token",
							discordAccountId: user.id,
							serverId: server.discordId,
							channelId: channel.id,
							solutionTagId: null,
						},
					),
				);

				expect(result).toBeDefined();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});
});
