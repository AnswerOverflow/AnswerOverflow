import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { modules } from "../convex/test.setup";

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

import { convexTest } from "convex-test";
import { test } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

test("sending messages", async () => {
	const t = convexTest(schema, modules);

	const result = await t.mutation(api.servers.upsertServerExternal, {
		apiKey: "hello",
		data: {
			name: "Test Server",
			description: "Test Description",
			icon: "https://example.com/icon.png",
			vanityInviteCode: "test",
			vanityUrl: "test",
			discordId: "",
			bitfield: 0,
			plan: "FREE",
			approximateMemberCount: 0,
		},
	});

	console.log(result);
});
