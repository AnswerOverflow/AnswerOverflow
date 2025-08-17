/** biome-ignore-all lint/suspicious/noExplicitAny: needed for mocks */
import { it } from "@effect/vitest";
import { Database, DatabaseTestLayer } from "@packages/database/database";
import { DiscordREST } from "dfx/DiscordREST";
import { Effect, Layer } from "effect";
import { expect } from "vitest";
import { make } from "./guild-parity";
import {
	DiscordGatewayMock,
	MockDiscordGatewaySharedLayer,
} from "./mock-gateway";

const GUILD_ID = "123";

const fakeGuild = {
	id: GUILD_ID,
	name: "Test Guild",
	icon: "icon_hash",
	description: "A cool guild",
	vanity_url_code: "invite123",
	approximate_member_count: 1337,
} as any;

const MockDiscordRest = Layer.mock(DiscordREST, {
	withFormData: () => (eff: any) => eff,
	withFiles: () => (eff: any) => eff,
	httpClient: {} as any,
	getGuild: (_id: string) => Effect.succeed(fakeGuild),
});

it.scopedLive("upserts guild via READY dispatch", () =>
	Effect.gen(function* () {
		const gateway = yield* DiscordGatewayMock;
		yield* make;

		yield* gateway.emit("READY", {
			v: 10,
			user: { id: "user", username: "tester" } as any,
			guilds: [{ id: GUILD_ID, unavailable: false }],
			session_id: "session",
			resume_gateway_url: "wss://gateway",
			application: { id: "app", flags: 0 },
		});

		// Assert DB
		const db = yield* Database;
		const server = yield* db.servers.getServerById(GUILD_ID);
		expect(server).toBeTruthy();
		expect(server?.discordId).toBe(GUILD_ID);
	}).pipe(
		Effect.provide(
			Layer.mergeAll(
				DatabaseTestLayer,
				MockDiscordRest,
				MockDiscordGatewaySharedLayer,
			),
		),
	),
);
