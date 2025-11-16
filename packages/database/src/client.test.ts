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

		expect(created?.discordId).toBe("123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"getServerByDiscordId uses watch cache - only makes 1 query for 5 calls",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;
			const convexClientTest = yield* ConvexClientTest;

			yield* database.servers.upsertServer(server);

			const results = yield* Effect.all(
				Array.from({ length: 5 }, () =>
					database.servers.getServerByDiscordId(
						{ discordId: "123" },
						{ subscribe: true },
					),
				),
			);

			const queryCallCount = convexClientTest.getQueryCallCount(
				api.publicInternal.servers.getServerByDiscordId,
				{ discordId: "123", backendAccessToken: "test-backend-access-token" },
			);
			const otherQueryCallCount = convexClientTest.getQueryCallCount(
				api.authenticated.servers.publicGetServerByDiscordId,
				// @ts-expect-error - intentionally passing wrong args to verify functions are tracked separately
				{ discordId: "123", backendAccessToken: "test-backend-access-token" },
			);
			expect(queryCallCount).toBe(1);
			expect(otherQueryCallCount).toBe(0);
			for (const result of results) {
				expect(result?.data?.discordId).toBe("123");
			}

			const updatedDescription = "Updated Description";
			yield* database.servers.upsertServer({
				...server,
				description: updatedDescription,
			});
			for (const result of results) {
				expect(result?.data?.description).toBe(updatedDescription);
			}
		}).pipe(Effect.provide(DatabaseTestLayer)),
);
