import { expect, it } from "@effect/vitest";
import { generateSnowflakeString } from "@packages/test-utils/snowflakes";
import { Effect } from "effect";
import type { Server } from "../convex/schema";
import { Database } from "./database";
import { DatabaseTestLayer } from "./database-test";

const serverDiscordId = generateSnowflakeString();

const server: Server = {
	name: "Test Server",
	description: "Test Description",
	icon: "https://example.com/icon.png",
	vanityInviteCode: "test",
	vanityUrl: "test",
	discordId: serverDiscordId,
	plan: "FREE",
	approximateMemberCount: 0,
};

it.scoped("live data updates when server is modified", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(server);

		const liveData = yield* database.servers.getServerByDiscordId(
			{
				discordId: serverDiscordId,
			},
			{ subscribe: true },
		);

		expect(liveData?.data?.discordId).toBe(serverDiscordId);
		expect(liveData?.data?.description).toBe("Test Description");

		const updatedDescription = `A brand new description ${Math.random()}`;
		yield* database.servers.upsertServer({
			...server,
			description: updatedDescription,
		});

		expect(liveData?.data?.description).toBe(updatedDescription);
		expect(liveData?.data?.discordId).toBe(serverDiscordId);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);
