import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import type { Server } from "../convex/schema";
import { ConvexClientTest } from "./convex-client-test";
import { Database, DatabaseTestLayer } from "./database";

const server: Server = {
	name: "Test Server",
	description: "Test Description",
	icon: "https://example.com/icon.png",
	vanityInviteCode: "test",
	vanityUrl: "test",
	discordId: "123",
	bitfield: 0,
	plan: "FREE",
	approximateMemberCount: 0,
};

it.effect("upserting server", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		const testClient = yield* ConvexClientTest;

		yield* database.servers.upsertServer(server);

		const created = yield* database.servers.getServerById("123");
		yield* testClient.use((client) => {
			client.finishInProgressScheduledFunctions();
		});
		expect(created?.discordId).toBe("123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);
