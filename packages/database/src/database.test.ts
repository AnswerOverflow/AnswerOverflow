import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { api } from "../convex/_generated/api";
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
				});

				database.metrics.resetQueryMetrics();

				const result1 = yield* database.private.servers.getServerByDiscordId(
					{ discordId: testDiscordId },
					{ subscribe: false },
				);
				expect(result1).not.toBeNull();
				expect(result1?.name).toBe("Test Server");

				const metricsAfterFirst = database.metrics.getQueryMetrics(
					api.private.servers.getServerByDiscordId,
					{ discordId: testDiscordId },
				);
				expect(metricsAfterFirst.misses).toBe(1);
				expect(metricsAfterFirst.hits).toBe(0);

				const result2 = yield* database.private.servers.getServerByDiscordId(
					{ discordId: testDiscordId },
					{ subscribe: false },
				);
				expect(result2).not.toBeNull();
				expect(result2?.name).toBe("Test Server");

				const metricsAfterSecond = database.metrics.getQueryMetrics(
					api.private.servers.getServerByDiscordId,
					{ discordId: testDiscordId },
				);
				expect(metricsAfterSecond.misses).toBe(1);
				expect(metricsAfterSecond.hits).toBe(1);

				expect(result1?.discordId).toBe(result2?.discordId);
			}).pipe(Effect.provide(DatabaseTestLayer)),
	);

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

	it.scoped("should cache different queries separately", () =>
		Effect.gen(function* () {
			const database = yield* Database;

			const testDiscordId1 = BigInt(Date.now());
			const testDiscordId2 = BigInt(Date.now() + 1);

			yield* database.private.servers.upsertServer({
				discordId: testDiscordId1,
				name: "Server One",
				approximateMemberCount: 50,
			});

			yield* database.private.servers.upsertServer({
				discordId: testDiscordId2,
				name: "Server Two",
				approximateMemberCount: 75,
			});

			database.metrics.resetQueryMetrics();

			const result1 = yield* database.private.servers.getServerByDiscordId(
				{ discordId: testDiscordId1 },
				{ subscribe: false },
			);
			const result2 = yield* database.private.servers.getServerByDiscordId(
				{ discordId: testDiscordId2 },
				{ subscribe: false },
			);

			expect(result1?.name).toBe("Server One");
			expect(result2?.name).toBe("Server Two");

			expect(
				database.metrics.getQueryMetrics(
					api.private.servers.getServerByDiscordId,
					{ discordId: testDiscordId1 },
				).misses,
			).toBe(1);
			expect(
				database.metrics.getQueryMetrics(
					api.private.servers.getServerByDiscordId,
					{ discordId: testDiscordId1 },
				).hits,
			).toBe(0);
			expect(
				database.metrics.getQueryMetrics(
					api.private.servers.getServerByDiscordId,
					{ discordId: testDiscordId2 },
				).misses,
			).toBe(1);
			expect(
				database.metrics.getQueryMetrics(
					api.private.servers.getServerByDiscordId,
					{ discordId: testDiscordId2 },
				).hits,
			).toBe(0);

			const result1Again = yield* database.private.servers.getServerByDiscordId(
				{ discordId: testDiscordId1 },
				{ subscribe: false },
			);
			const result2Again = yield* database.private.servers.getServerByDiscordId(
				{ discordId: testDiscordId2 },
				{ subscribe: false },
			);

			expect(result1Again?.name).toBe("Server One");
			expect(result2Again?.name).toBe("Server Two");

			expect(
				database.metrics.getQueryMetrics(
					api.private.servers.getServerByDiscordId,
					{ discordId: testDiscordId1 },
				).misses,
			).toBe(1);
			expect(
				database.metrics.getQueryMetrics(
					api.private.servers.getServerByDiscordId,
					{ discordId: testDiscordId1 },
				).hits,
			).toBe(1);
			expect(
				database.metrics.getQueryMetrics(
					api.private.servers.getServerByDiscordId,
					{ discordId: testDiscordId2 },
				).misses,
			).toBe(1);
			expect(
				database.metrics.getQueryMetrics(
					api.private.servers.getServerByDiscordId,
					{ discordId: testDiscordId2 },
				).hits,
			).toBe(1);
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
			});

			database.metrics.resetQueryMetrics();

			const allServers1 = yield* database.private.servers.getAllServers(
				{},
				{ subscribe: false },
			);
			expect(allServers1.length).toBeGreaterThan(0);

			expect(
				database.metrics.getQueryMetrics(api.private.servers.getAllServers, {})
					.misses,
			).toBe(1);
			expect(
				database.metrics.getQueryMetrics(api.private.servers.getAllServers, {})
					.hits,
			).toBe(0);

			const allServers2 = yield* database.private.servers.getAllServers(
				{},
				{ subscribe: false },
			);
			expect(allServers2.length).toBe(allServers1.length);

			expect(
				database.metrics.getQueryMetrics(api.private.servers.getAllServers, {})
					.misses,
			).toBe(1);
			expect(
				database.metrics.getQueryMetrics(api.private.servers.getAllServers, {})
					.hits,
			).toBe(1);
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
			});

			database.metrics.resetQueryMetrics();

			const [result1, result2] = yield* Effect.all(
				[
					database.private.servers.getServerByDiscordId(
						{ discordId: testDiscordId },
						{ subscribe: false },
					),
					database.private.servers.getServerByDiscordId(
						{ discordId: testDiscordId },
						{ subscribe: false },
					),
				],
				{ concurrency: "unbounded" },
			);

			expect(result1).not.toBeNull();
			expect(result2).not.toBeNull();
			expect(result1?.name).toBe("Concurrent Server");
			expect(result2?.name).toBe("Concurrent Server");
			expect(result1?.discordId).toBe(result2?.discordId);

			const metrics = database.metrics.getQueryMetrics(
				api.private.servers.getServerByDiscordId,
				{ discordId: testDiscordId },
			);
			expect(metrics.misses).toBe(1);
			expect(metrics.hits).toBe(1);
		}).pipe(Effect.provide(DatabaseTestLayer)),
	);
});
