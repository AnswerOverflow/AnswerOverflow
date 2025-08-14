import { expect, it, vi } from "@effect/vitest";
import { Effect } from "effect";
import { Convex, ConvexTestLayer } from "./client";
import { ConvexClientTest } from "./convex-client-test";

const test = Effect.gen(function* () {
	vi.useFakeTimers();
	const client = yield* Convex;
	const test = yield* ConvexClientTest;

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

	vi.runAllTimers();

	yield* test.use((client) => client.finishInProgressScheduledFunctions());

	const server = yield* client.getServerById("123");
	expect(server?.discordId).toBe("123");
}).pipe(Effect.provide(ConvexTestLayer));

it.effect("sending messages", () => test);
