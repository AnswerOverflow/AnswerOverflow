import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { api } from "../convex/_generated/api";
import type { Server } from "../convex/schema";
import { ConvexClientTest } from "./convex-client-test";
import { Database } from "./database";
import { DatabaseTestLayer } from "./database-test";

const server: Server = {
	name: "Test Server",
	description: "Test Description",
	icon: "https://example.com/icon.png",
	vanityInviteCode: "test",
	vanityUrl: "test",
	discordId: "123",
	plan: "FREE",
	approximateMemberCount: 0,
};

it.scoped("upserting server", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(server);

		const created = yield* database.servers.getServerByDiscordId({
			discordId: "123",
		});

		// Data should already be loaded due to defer mechanism
		expect(created?.discordId).toBe("123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"getServerByDiscordId uses watch cache - only makes 1 query for 5 calls",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;
			const convexClientTest = yield* ConvexClientTest;

			// Set up server data
			yield* database.servers.upsertServer(server);

			// Call getServerByDiscordId 5 times - should reuse the same watch from cache
			const results = yield* Effect.all(
				Array.from({ length: 5 }, () =>
					database.servers.getServerByDiscordId(
						{ discordId: "123" },
						{ subscribe: true },
					),
				),
			);

			// Verify that only 1 query was made despite 5 calls to getServerByDiscordId
			const queryCallCount = convexClientTest.getQueryCallCount(
				api.public.servers.publicGetServerByDiscordId,
				{ discordId: "123" },
			);
			expect(queryCallCount).toBe(1);

			// Data should already be loaded due to defer mechanism
			// Verify all results are correct
			for (const result of results) {
				expect(result?.data?.discordId).toBe("123");
			}

			// Verify cache works by checking that all LiveData instances share the same watch
			// If the cache works, all 5 calls should reuse the same watch, meaning they should
			// all update together when data changes
			const updatedDescription = "Updated Description";
			yield* database.servers.upsertServer({
				...server,
				description: updatedDescription,
			});
			// Verify all instances updated together (they share the same watch)
			for (const result of results) {
				expect(result?.data?.description).toBe(updatedDescription);
			}
		}).pipe(Effect.provide(DatabaseTestLayer)),
);
