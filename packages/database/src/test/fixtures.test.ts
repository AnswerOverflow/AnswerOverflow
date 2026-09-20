import { expect, it } from "@effect/vitest";
import { SNOWFLAKE_MIN } from "@packages/database-utils/snowflakes-test";
import { Effect } from "effect";
import { Database } from "../database";
import { DatabaseTestLayer } from "../database-test";
import { createChannel, createServer } from "./fixtures";

it.scoped(
	"fixture inserts stay distinct and explicit IDs still support updates",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;
			const server = yield* createServer();
			const explicitId = SNOWFLAKE_MIN + 2n;
			yield* createChannel(server.discordId, {
				id: explicitId,
				name: "before",
				type: 0,
			});
			const defaults = yield* Effect.forEach(Array.from({ length: 32 }), () =>
				createChannel(server.discordId, { type: 0 }),
			);
			yield* createChannel(server.discordId, {
				id: explicitId,
				name: "after",
				type: 0,
			});
			const channels =
				yield* database.private.channels.findAllChannelsByServerId({
					serverId: server.discordId,
				});
			expect(new Set(defaults.map((channel) => channel.id)).size).toBe(32);
			expect(defaults.some((channel) => channel.id === explicitId)).toBe(false);
			expect(channels).toHaveLength(33);
			expect(channels.find((channel) => channel.id === explicitId)?.name).toBe(
				"after",
			);
		}).pipe(Effect.provide(DatabaseTestLayer)),
);
