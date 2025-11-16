import { createConvexOtelLayer } from "@packages/observability/convex-effect-otel";
import { v } from "convex/values";
import { Effect } from "effect";
import { authenticatedQuery } from "../client";
import { getServerByDiscordId as getServerByDiscordIdShared } from "../shared/shared";

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
