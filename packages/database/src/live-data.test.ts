import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import type { Server } from "../convex/schema";
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

it.scoped("live data updates when server is modified", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Initial upsert
		yield* database.servers.upsertServer(server);

		// Get live data
		const liveData = yield* database.servers.getServerByDiscordId({
			discordId: "123",
		});

		// Data should already be loaded due to defer mechanism
		expect(liveData?.discordId).toBe("123");
		expect(liveData?.description).toBe("Test Description");

		// Update the server
		const updatedDescription = `A brand new description ${Math.random()}`;
		yield* database.servers.upsertServer({
			...server,
			description: updatedDescription,
		});

		// Verify live data has updated
		expect(liveData?.description).toBe(updatedDescription);
		expect(liveData?.discordId).toBe("123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);
