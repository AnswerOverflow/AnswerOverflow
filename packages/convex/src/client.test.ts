import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { Convex, ConvexTestLayer } from "./client";

const test = Effect.gen(function* () {
	const client = yield* Convex;

	yield* client.upsertServer({
		name: "Test Server",
		description: "Test Description",
		icon: "https://example.com/icon.png",
		vanityInviteCode: "test",
		vanityUrl: "test",
		discordId: "123",
		bitfield: 0,
		plan: "FREE",
		approximateMemberCount: 0,
	});

	const server = yield* client.getServerById("123");
	expect(server?.discordId).toBe("123");
}).pipe(Effect.provide(ConvexTestLayer));

it.effect("sending messages", () => test);
