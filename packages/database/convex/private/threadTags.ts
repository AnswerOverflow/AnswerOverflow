import { getManyFrom } from "convex-helpers/server/relationships";
import { Effect, Schema } from "effect";
import { privateMutation, ConfectMutationCtx } from "../client/confectPrivate";

export const syncThreadTags = privateMutation({
	args: Schema.Struct({
		threadId: Schema.BigIntFromSelf,
		parentChannelId: Schema.BigIntFromSelf,
		tagIds: Schema.Array(Schema.BigIntFromSelf),
	}),
	returns: Schema.Null,
	handler: ({ threadId, parentChannelId, tagIds }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectMutationCtx;

			const existingTags = yield* Effect.promise(() =>
				getManyFrom(ctx.db, "threadTags", "by_threadId", threadId),
			);

			for (const tag of existingTags) {
				yield* Effect.promise(() => ctx.db.delete(tag._id));
			}

			for (const tagId of tagIds) {
				yield* Effect.promise(() =>
					ctx.db.insert("threadTags", {
						threadId,
						tagId,
						parentChannelId,
					}),
				);
			}

			return null;
		}).pipe(Effect.orDie),
});
