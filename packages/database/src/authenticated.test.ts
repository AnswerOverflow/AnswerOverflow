import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { Database } from "./database";
import { DatabaseTestLayer } from "./database-test";

describe("Authenticated queries", () => {
	describe("Discord bot path (discordAccountId)", () => {
		it.scoped(
			"should call authenticated query with discordAccountId option",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;

					const testDiscordAccountId = BigInt(Date.now());
					const testServerId = BigInt(Date.now() + 1);

					yield* database.private.servers.upsertServer({
						discordId: testServerId,
						name: "Test Auth Server",
						approximateMemberCount: 100,
					});

					yield* database.private.user_server_settings.upsertUserServerSettings(
						{
							settings: {
								userId: testDiscordAccountId,
								serverId: testServerId,
								permissions: 2147483647,
								canPubliclyDisplayMessages: true,
								messageIndexingDisabled: false,
								apiCallsUsed: 0,
							},
						},
					);

					const result =
						yield* database.authenticated.dashboard_queries.getUserServersForDropdown(
							{},
							{ discordAccountId: testDiscordAccountId, subscribe: false },
						);

					expect(result).toBeDefined();
					expect(Array.isArray(result)).toBe(true);
					expect(result.length).toBeGreaterThanOrEqual(1);

					const foundServer = result.find((s) => s.discordId === testServerId);
					expect(foundServer).toBeDefined();
					expect(foundServer?.name).toBe("Test Auth Server");
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should return empty array for user with no server settings",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;

					const nonExistentUserId = BigInt(999999999999);

					const result =
						yield* database.authenticated.dashboard_queries.getUserServersForDropdown(
							{},
							{ discordAccountId: nonExistentUserId, subscribe: false },
						);

					expect(result).toBeDefined();
					expect(Array.isArray(result)).toBe(true);
					expect(result.length).toBe(0);
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped(
			"should only return servers where user has manage guild permissions",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;

					const testDiscordAccountId = BigInt(Date.now());
					const managedServerId = BigInt(Date.now() + 1);
					const nonManagedServerId = BigInt(Date.now() + 2);

					yield* database.private.servers.upsertServer({
						discordId: managedServerId,
						name: "Managed Server",
						approximateMemberCount: 100,
					});

					yield* database.private.servers.upsertServer({
						discordId: nonManagedServerId,
						name: "Non-Managed Server",
						approximateMemberCount: 50,
					});

					yield* database.private.user_server_settings.upsertUserServerSettings(
						{
							settings: {
								userId: testDiscordAccountId,
								serverId: managedServerId,
								permissions: 32,
								canPubliclyDisplayMessages: true,
								messageIndexingDisabled: false,
								apiCallsUsed: 0,
							},
						},
					);

					yield* database.private.user_server_settings.upsertUserServerSettings(
						{
							settings: {
								userId: testDiscordAccountId,
								serverId: nonManagedServerId,
								permissions: 0,
								canPubliclyDisplayMessages: true,
								messageIndexingDisabled: false,
								apiCallsUsed: 0,
							},
						},
					);

					const result =
						yield* database.authenticated.dashboard_queries.getUserServersForDropdown(
							{},
							{ discordAccountId: testDiscordAccountId, subscribe: false },
						);

					expect(result).toBeDefined();
					expect(Array.isArray(result)).toBe(true);

					const managedFound = result.find(
						(s) => s.discordId === managedServerId,
					);
					const nonManagedFound = result.find(
						(s) => s.discordId === nonManagedServerId,
					);

					expect(managedFound).toBeDefined();
					expect(managedFound?.name).toBe("Managed Server");
					expect(nonManagedFound).toBeUndefined();
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("Main site path (token)", () => {
		it.scoped(
			"should attempt authentication with token (fails in test env without valid session)",
			() =>
				Effect.gen(function* () {
					const database = yield* Database;

					const result = yield* Effect.either(
						database.authenticated.dashboard_queries.getUserServersForDropdown(
							{},
							{ token: "test-jwt-token", subscribe: false },
						),
					);

					expect(result._tag).toBe("Left");
					if (result._tag === "Left") {
						expect(result.left.cause).toBeDefined();
					}
				}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});
});
