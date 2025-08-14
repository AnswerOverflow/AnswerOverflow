import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { Convex, ConvexTestLayer } from "./client";

// A simple divide function that returns an Effect, failing when dividing by zero
function divide(a: number, b: number) {
	if (b === 0) return Effect.fail("Cannot divide by zero");
	return Effect.succeed(a / b);
}

// Testing a successful division
it.effect("test success", () =>
	Effect.gen(function* () {
		const result = yield* divide(4, 2); // Expect 4 divided by 2 to succeed
		expect(result).toBe(2); // Assert that the result is 2
	}),
);

it.effect("sending messages", () =>
	Effect.gen(function* () {
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
	}).pipe(Effect.provide(ConvexTestLayer)),
);
