import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { Database } from "../../src/database";
import { DatabaseTestLayer } from "../../src/database-test";
import { createServer } from "../../src/test";

describe("server_preferences", () => {
	describe("upsertServerPreferences", () => {
		it.scoped("should create new preferences", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();

				const result =
					yield* database.private.server_preferences.upsertServerPreferences({
						serverId: server.discordId,
						plan: "FREE",
					});

				expect(result.serverId).toBe(server.discordId);
				expect(result.plan).toBe("FREE");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should update existing preferences", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();

				yield* database.private.server_preferences.upsertServerPreferences({
					serverId: server.discordId,
					plan: "FREE",
				});

				const result =
					yield* database.private.server_preferences.upsertServerPreferences({
						serverId: server.discordId,
						plan: "PRO",
					});

				expect(result.plan).toBe("PRO");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should store custom domain", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();

				const result =
					yield* database.private.server_preferences.upsertServerPreferences({
						serverId: server.discordId,
						plan: "PRO",
						customDomain: "myserver.example.com",
					});

				expect(result.customDomain).toBe("myserver.example.com");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should reject duplicate custom domain", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server1 = yield* createServer();
				const server2 = yield* createServer();

				yield* database.private.server_preferences.upsertServerPreferences({
					serverId: server1.discordId,
					plan: "PRO",
					customDomain: "unique.example.com",
				});

				const result = yield* Effect.either(
					database.private.server_preferences.upsertServerPreferences({
						serverId: server2.discordId,
						plan: "PRO",
						customDomain: "unique.example.com",
					}),
				);

				expect(result._tag).toBe("Left");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should allow same server to keep its domain", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();

				yield* database.private.server_preferences.upsertServerPreferences({
					serverId: server.discordId,
					plan: "PRO",
					customDomain: "myserver.example.com",
				});

				const result =
					yield* database.private.server_preferences.upsertServerPreferences({
						serverId: server.discordId,
						plan: "ENTERPRISE",
						customDomain: "myserver.example.com",
					});

				expect(result.plan).toBe("ENTERPRISE");
				expect(result.customDomain).toBe("myserver.example.com");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("getServerPreferencesByServerId", () => {
		it.scoped("should return null for non-existent preferences", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const nonExistentId = BigInt(999999999999);

				const result =
					yield* database.private.server_preferences.getServerPreferencesByServerId(
						{ serverId: nonExistentId },
						{ subscribe: false },
					);

				expect(result).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return existing preferences", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();

				yield* database.private.server_preferences.upsertServerPreferences({
					serverId: server.discordId,
					plan: "ADVANCED",
					considerAllMessagesPublicEnabled: true,
				});

				const result =
					yield* database.private.server_preferences.getServerPreferencesByServerId(
						{ serverId: server.discordId },
						{ subscribe: false },
					);

				expect(result).not.toBeNull();
				expect(result?.plan).toBe("ADVANCED");
				expect(result?.considerAllMessagesPublicEnabled).toBe(true);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("updateServerPreferences", () => {
		it.scoped("should update partial preferences", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();

				yield* database.private.server_preferences.upsertServerPreferences({
					serverId: server.discordId,
					plan: "FREE",
				});

				yield* database.private.server_preferences.updateServerPreferences({
					serverId: server.discordId,
					preferences: {
						plan: "STARTER",
						anonymizeMessagesEnabled: true,
					},
				});

				const result =
					yield* database.private.server_preferences.getServerPreferencesByServerId(
						{ serverId: server.discordId },
						{ subscribe: false },
					);

				expect(result?.plan).toBe("STARTER");
				expect(result?.anonymizeMessagesEnabled).toBe(true);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("updateStripeCustomer", () => {
		it.scoped("should update stripe customer id", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();

				yield* database.private.server_preferences.upsertServerPreferences({
					serverId: server.discordId,
					plan: "FREE",
				});

				yield* database.private.server_preferences.updateStripeCustomer({
					serverId: server.discordId,
					stripeCustomerId: "cus_abc123",
				});

				const result =
					yield* database.private.server_preferences.getServerPreferencesByServerId(
						{ serverId: server.discordId },
						{ subscribe: false },
					);

				expect(result?.stripeCustomerId).toBe("cus_abc123");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("updateStripeSubscription", () => {
		it.scoped("should update stripe subscription and plan", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();

				yield* database.private.server_preferences.upsertServerPreferences({
					serverId: server.discordId,
					plan: "FREE",
				});

				yield* database.private.server_preferences.updateStripeSubscription({
					serverId: server.discordId,
					stripeSubscriptionId: "sub_xyz789",
					plan: "PRO",
				});

				const result =
					yield* database.private.server_preferences.getServerPreferencesByServerId(
						{ serverId: server.discordId },
						{ subscribe: false },
					);

				expect(result?.stripeSubscriptionId).toBe("sub_xyz789");
				expect(result?.plan).toBe("PRO");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("plan types", () => {
		it.scoped("should accept all valid plan types", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const plans = [
					"FREE",
					"STARTER",
					"ADVANCED",
					"PRO",
					"ENTERPRISE",
					"OPEN_SOURCE",
				] as const;

				for (const plan of plans) {
					const server = yield* createServer();

					const result =
						yield* database.private.server_preferences.upsertServerPreferences({
							serverId: server.discordId,
							plan,
						});

					expect(result.plan).toBe(plan);
				}
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});
});
