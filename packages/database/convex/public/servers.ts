import { createConvexOtelLayer } from "@packages/observability/convex-effect-otel";
import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getOneFrom } from "convex-helpers/server/relationships";
import { Effect } from "effect";
import { query } from "../_generated/server";
import { authenticatedQuery } from "../client";
import { getServerByDiscordId as getServerByDiscordIdShared } from "../shared/shared";

/**
 * Public query: Get server by Discord ID
 * No authentication required - returns public server data
 */
export const publicGetServerByDiscordId = authenticatedQuery({
	args: {
		discordId: v.string(),
	},
	handler: async (ctx, args) => {
		const tracedEffect = Effect.gen(function* () {
			return yield* Effect.withSpan("servers.getServerByDiscordId")(
				Effect.gen(function* () {
					yield* Effect.annotateCurrentSpan({
						"discord.id": args.discordId,
						"convex.function": "publicGetServerByDiscordId",
					});
					return yield* Effect.tryPromise({
						try: () => getServerByDiscordIdShared(ctx, args.discordId),
						catch: (error) => new Error(String(error)),
					});
				}),
			);
		});
		return await Effect.provide(
			tracedEffect,
			createConvexOtelLayer("database"),
		).pipe(Effect.runPromise);
	},
});

export const publicFindManyServersById = query({
	args: {
		ids: v.array(v.id("servers")),
	},
	handler: async (ctx, args) => {
		if (args.ids.length === 0) return [];
		const results = await asyncMap(args.ids, (id) => ctx.db.get(id));
		return results.filter((server) => server !== null);
	},
});

/**
 * Public query: Find many servers by Discord IDs
 * More efficient than calling publicGetServerByDiscordId multiple times
 */
export const publicFindManyServersByDiscordId = query({
	args: {
		discordIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const tracedEffect = Effect.gen(function* () {
			yield* Effect.annotateCurrentSpan({
				"convex.function": "publicFindManyServersByDiscordId",
				"servers.count": args.discordIds.length,
			});
			if (args.discordIds.length === 0) return [];
			// Use the index to query each Discord ID efficiently
			// Execute queries in parallel using Effect.all for better Effect integration
			const results = yield* Effect.all(
				args.discordIds.map((discordId) =>
					Effect.promise(() =>
						getOneFrom(ctx.db, "servers", "by_discordId", discordId),
					),
				),
				{ concurrency: "unbounded" },
			);
			return results.filter((server) => server !== null);
		}).pipe(
			Effect.withSpan("servers.findManyServersByDiscordId", {
				attributes: {
					"convex.function": "publicFindManyServersByDiscordId",
				},
			}),
		);
		return await Effect.provide(
			tracedEffect,
			createConvexOtelLayer("database"),
		).pipe(Effect.runPromise);
	},
});
