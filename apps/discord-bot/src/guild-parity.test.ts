/** biome-ignore-all lint/suspicious/noExplicitAny: needed for mocks */
import { it } from "@effect/vitest";
import { Database, DatabaseTestLayer } from "@packages/database/database";
import { Effect, Layer } from "effect";
import { expect } from "vitest";
import { make } from "./guild-parity";
import { DiscordClient, DiscordClientLayer } from "./services/discord";

const GUILD_ID = "123";

const fakeGuild = {
	id: GUILD_ID,
	name: "Test Guild",
	icon: "icon_hash",
	description: "A cool guild",
	vanity_url_code: "invite123",
	approximate_member_count: 1337,
} as any;

it.scopedLive("upserts guild via READY dispatch", () =>
	Effect.gen(function* () {
		yield* make;
		const client = yield* DiscordClient;
		client.client.guilds.cache.set(GUILD_ID, fakeGuild);

		client.client.emit("ready", client.client as any);
		const db = yield* Database;
		// sleep for 1 second
		yield* Effect.sleep("1  millis");
		const server = yield* db.servers.getServerById(GUILD_ID);
		const allServers = yield* db.servers.publicGetAllServers();
		console.log("allServers", allServers, server, GUILD_ID);
		expect(server).toBeTruthy();
		expect(server?.data?.discordId).toBe(GUILD_ID);
	}).pipe(
		Effect.provide(Layer.mergeAll(DatabaseTestLayer, DiscordClientLayer)),
	),
);
