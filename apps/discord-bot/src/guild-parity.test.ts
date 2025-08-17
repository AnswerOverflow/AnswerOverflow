/** biome-ignore-all lint/suspicious/noExplicitAny: needed for mocks */
import { it } from "@effect/vitest";
import { Database, DatabaseTestLayer } from "@packages/database/database";
import { DiscordREST } from "dfx/DiscordREST";
import { DiscordGateway } from "dfx/gateway";
import { Effect, Layer, TestClock } from "effect";
import { expect } from "vitest";
import { make } from "./guild-parity";
import { MockDiscordGateway } from "./mock-gateway";

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

it.layer(
	Layer.mergeAll(DatabaseTestLayer, MockDiscordRest, MockDiscordGateway),
)((it) =>
	it.effect("upserts guild via READY dispatch", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const gateway = yield* DiscordGateway;
				yield* make;
				// wait 1 second
				yield* TestClock.adjust(1000);
				yield* (gateway as any).emit("READY", {
					v: 10,
					user: { id: "user", username: "tester" } as any,
					guilds: [{ id: GUILD_ID, unavailable: false }],
					session_id: "session",
					resume_gateway_url: "wss://gateway",
					application: { id: "app", flags: 0 },
				} as any) as Effect.Effect<void>;
				yield* TestClock.adjust(1000);

				// Assert DB
				const db = yield* Database;
				const server = yield* db.servers.getServerById(GUILD_ID);
				expect(server).toBeTruthy();
				expect(server?.discordId).toBe(GUILD_ID);
			}),
		),
	),
);
