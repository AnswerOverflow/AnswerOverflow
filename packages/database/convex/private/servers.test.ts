import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { Database } from "../../src/database";
import { DatabaseTestLayer } from "../../src/database-test";
import { createServer } from "../../src/test";

describe("servers", () => {
	describe("upsertServer", () => {
		it.scoped("should create a new server", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const discordId = BigInt(Date.now());

				const result = yield* database.private.servers.upsertServer({
					discordId,
					name: "Test Server",
					approximateMemberCount: 100,
				});

				expect(result.isNew).toBe(true);

				const server = yield* database.private.servers.getServerByDiscordId(
					{ discordId },
					{ subscribe: false },
				);
				expect(server).not.toBeNull();
				expect(server?.name).toBe("Test Server");
				expect(server?.approximateMemberCount).toBe(100);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should update an existing server", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const discordId = BigInt(Date.now());

				yield* database.private.servers.upsertServer({
					discordId,
					name: "Original Name",
					approximateMemberCount: 100,
				});

				const result = yield* database.private.servers.upsertServer({
					discordId,
					name: "Updated Name",
					approximateMemberCount: 200,
				});

				expect(result.isNew).toBe(false);

				const server = yield* database.private.servers.getServerByDiscordId(
					{ discordId },
					{ subscribe: false },
				);
				expect(server?.name).toBe("Updated Name");
				expect(server?.approximateMemberCount).toBe(200);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should store optional fields", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const discordId = BigInt(Date.now());

				yield* database.private.servers.upsertServer({
					discordId,
					name: "Server with Extras",
					approximateMemberCount: 500,
					icon: "abc123",
					description: "A cool server",
					vanityInviteCode: "coolserver",
				});

				const server = yield* database.private.servers.getServerByDiscordId(
					{ discordId },
					{ subscribe: false },
				);
				expect(server?.icon).toBe("abc123");
				expect(server?.description).toBe("A cool server");
				expect(server?.vanityInviteCode).toBe("coolserver");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("getServerByDiscordId", () => {
		it.scoped("should return null for non-existent server", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const nonExistentId = BigInt(999999999999);

				const result = yield* database.private.servers.getServerByDiscordId(
					{ discordId: nonExistentId },
					{ subscribe: false },
				);

				expect(result).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return existing server", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer({ name: "Find Me" });

				const result = yield* database.private.servers.getServerByDiscordId(
					{ discordId: server.discordId },
					{ subscribe: false },
				);

				expect(result).not.toBeNull();
				expect(result?.name).toBe("Find Me");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("updateServer", () => {
		it.scoped("should update server fields", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer({ name: "Before Update" });

				yield* database.private.servers.updateServer({
					serverId: server.discordId,
					server: { name: "After Update" },
				});

				const updated = yield* database.private.servers.getServerByDiscordId(
					{ discordId: server.discordId },
					{ subscribe: false },
				);
				expect(updated?.name).toBe("After Update");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should fail for non-existent server", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const nonExistentId = BigInt(999999999999);

				const result = yield* Effect.either(
					database.private.servers.updateServer({
						serverId: nonExistentId,
						server: { name: "Will Fail" },
					}),
				);

				expect(result._tag).toBe("Left");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("getAllServers", () => {
		it.scoped("should return all servers", () =>
			Effect.gen(function* () {
				const database = yield* Database;

				yield* createServer({ name: "Server 1" });
				yield* createServer({ name: "Server 2" });
				yield* createServer({ name: "Server 3" });

				const servers = yield* database.private.servers.getAllServers(
					{},
					{ subscribe: false },
				);

				expect(servers.length).toBeGreaterThanOrEqual(3);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("findManyServersByDiscordId", () => {
		it.scoped("should return matching servers", () =>
			Effect.gen(function* () {
				const database = yield* Database;

				const server1 = yield* createServer({ name: "Batch Server 1" });
				const server2 = yield* createServer({ name: "Batch Server 2" });

				const servers =
					yield* database.private.servers.findManyServersByDiscordId(
						{ discordIds: [server1.discordId, server2.discordId] },
						{ subscribe: false },
					);

				expect(servers.length).toBe(2);
				expect(servers.map((s) => s.name)).toContain("Batch Server 1");
				expect(servers.map((s) => s.name)).toContain("Batch Server 2");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should filter out non-existent ids", () =>
			Effect.gen(function* () {
				const database = yield* Database;

				const server1 = yield* createServer({ name: "Real Server" });
				const fakeId = BigInt(999999999999);

				const servers =
					yield* database.private.servers.findManyServersByDiscordId(
						{ discordIds: [server1.discordId, fakeId] },
						{ subscribe: false },
					);

				expect(servers.length).toBe(1);
				expect(servers[0]?.name).toBe("Real Server");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return empty array for empty input", () =>
			Effect.gen(function* () {
				const database = yield* Database;

				const servers =
					yield* database.private.servers.findManyServersByDiscordId(
						{ discordIds: [] },
						{ subscribe: false },
					);

				expect(servers).toEqual([]);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});
});
