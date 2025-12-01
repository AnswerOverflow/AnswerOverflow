import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { Database } from "./database";
import { DatabaseTestLayer } from "./database-test";

describe("Database query caching", () => {
	it.scoped(
		"should cache query results and only make one query to Convex",
		() =>
			Effect.gen(function* () {
				const database = yield* Database;

				const testDiscordId = BigInt(Date.now());

				yield* database.private.servers.upsertServer({
					discordId: testDiscordId,
					name: "Test Server",
					approximateMemberCount: 100,
					plan: "FREE",
				});

				database.metrics.resetQueryMetrics();

				const cacheKey = database.metrics.createCacheKey(
					"servers.getServerByDiscordId",
					{
						discordId: testDiscordId,
						backendAccessToken: "test-backend-access-token",
					},
				);

				const result1 = yield* database.private.servers.getServerByDiscordId({
					discordId: testDiscordId,
				});
				expect(result1).not.toBeNull();
				expect(result1?.name).toBe("Test Server");

				const metricsAfterFirst = database.metrics.getQueryMetrics(cacheKey);
				expect(metricsAfterFirst.misses).toBe(1);
				expect(metricsAfterFirst.hits).toBe(0);

				const result2 = yield* database.private.servers.getServerByDiscordId({
					discordId: testDiscordId,
				});
				expect(result2).not.toBeNull();
				expect(result2?.name).toBe("Test Server");

				const metricsAfterSecond = database.metrics.getQueryMetrics(cacheKey);
				expect(metricsAfterSecond.misses).toBe(1);
				expect(metricsAfterSecond.hits).toBe(1);

				expect(result1?.discordId).toBe(result2?.discordId);
			}).pipe(Effect.provide(DatabaseTestLayer)),
	);

	it.scoped("should return null for non-existent server", () =>
		Effect.gen(function* () {
			const database = yield* Database;

			const nonExistentId = BigInt(999999999999);

			const result = yield* database.private.servers.getServerByDiscordId({
				discordId: nonExistentId,
			});

			expect(result).toBeNull();
		}).pipe(Effect.provide(DatabaseTestLayer)),
	);

	it.scoped("should cache different queries separately", () =>
		Effect.gen(function* () {
			const database = yield* Database;

			const testDiscordId1 = BigInt(Date.now());
			const testDiscordId2 = BigInt(Date.now() + 1);

			yield* database.private.servers.upsertServer({
				discordId: testDiscordId1,
				name: "Server One",
				approximateMemberCount: 50,
				plan: "FREE",
			});

			yield* database.private.servers.upsertServer({
				discordId: testDiscordId2,
				name: "Server Two",
				approximateMemberCount: 75,
				plan: "FREE",
			});

			database.metrics.resetQueryMetrics();

			const cacheKey1 = database.metrics.createCacheKey(
				"servers.getServerByDiscordId",
				{
					discordId: testDiscordId1,
					backendAccessToken: "test-backend-access-token",
				},
			);
			const cacheKey2 = database.metrics.createCacheKey(
				"servers.getServerByDiscordId",
				{
					discordId: testDiscordId2,
					backendAccessToken: "test-backend-access-token",
				},
			);

			const result1 = yield* database.private.servers.getServerByDiscordId({
				discordId: testDiscordId1,
			});
			const result2 = yield* database.private.servers.getServerByDiscordId({
				discordId: testDiscordId2,
			});

			expect(result1?.name).toBe("Server One");
			expect(result2?.name).toBe("Server Two");

			expect(database.metrics.getQueryMetrics(cacheKey1).misses).toBe(1);
			expect(database.metrics.getQueryMetrics(cacheKey1).hits).toBe(0);
			expect(database.metrics.getQueryMetrics(cacheKey2).misses).toBe(1);
			expect(database.metrics.getQueryMetrics(cacheKey2).hits).toBe(0);

			const result1Again = yield* database.private.servers.getServerByDiscordId(
				{
					discordId: testDiscordId1,
				},
			);
			const result2Again = yield* database.private.servers.getServerByDiscordId(
				{
					discordId: testDiscordId2,
				},
			);

			expect(result1Again?.name).toBe("Server One");
			expect(result2Again?.name).toBe("Server Two");

			expect(database.metrics.getQueryMetrics(cacheKey1).misses).toBe(1);
			expect(database.metrics.getQueryMetrics(cacheKey1).hits).toBe(1);
			expect(database.metrics.getQueryMetrics(cacheKey2).misses).toBe(1);
			expect(database.metrics.getQueryMetrics(cacheKey2).hits).toBe(1);
		}).pipe(Effect.provide(DatabaseTestLayer)),
	);

	it.scoped("should cache getAllServers query", () =>
		Effect.gen(function* () {
			const database = yield* Database;

			const testDiscordId = BigInt(Date.now());

			yield* database.private.servers.upsertServer({
				discordId: testDiscordId,
				name: "Cached Server",
				approximateMemberCount: 200,
				plan: "FREE",
			});

			database.metrics.resetQueryMetrics();

			const cacheKey = database.metrics.createCacheKey(
				"servers.getAllServers",
				{
					backendAccessToken: "test-backend-access-token",
				},
			);

			const allServers1 = yield* database.private.servers.getAllServers();
			expect(allServers1.length).toBeGreaterThan(0);

			expect(database.metrics.getQueryMetrics(cacheKey).misses).toBe(1);
			expect(database.metrics.getQueryMetrics(cacheKey).hits).toBe(0);

			const allServers2 = yield* database.private.servers.getAllServers();
			expect(allServers2.length).toBe(allServers1.length);

			expect(database.metrics.getQueryMetrics(cacheKey).misses).toBe(1);
			expect(database.metrics.getQueryMetrics(cacheKey).hits).toBe(1);
		}).pipe(Effect.provide(DatabaseTestLayer)),
	);

	it.scoped("should handle concurrent queries for the same data", () =>
		Effect.gen(function* () {
			const database = yield* Database;

			const testDiscordId = BigInt(Date.now());

			yield* database.private.servers.upsertServer({
				discordId: testDiscordId,
				name: "Concurrent Server",
				approximateMemberCount: 100,
				plan: "FREE",
			});

			database.metrics.resetQueryMetrics();

			const cacheKey = database.metrics.createCacheKey(
				"servers.getServerByDiscordId",
				{
					discordId: testDiscordId,
					backendAccessToken: "test-backend-access-token",
				},
			);

			const [result1, result2] = yield* Effect.all(
				[
					database.private.servers.getServerByDiscordId({
						discordId: testDiscordId,
					}),
					database.private.servers.getServerByDiscordId({
						discordId: testDiscordId,
					}),
				],
				{ concurrency: "unbounded" },
			);

			expect(result1).not.toBeNull();
			expect(result2).not.toBeNull();
			expect(result1?.name).toBe("Concurrent Server");
			expect(result2?.name).toBe("Concurrent Server");
			expect(result1?.discordId).toBe(result2?.discordId);

			const metrics = database.metrics.getQueryMetrics(cacheKey);
			expect(metrics.misses).toBe(1);
			expect(metrics.hits).toBe(1);
		}).pipe(Effect.provide(DatabaseTestLayer)),
	);
});
