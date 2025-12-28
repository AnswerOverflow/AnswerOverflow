import { getManyFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Effect, Schema } from "effect";
import {
	publicQuery as confectPublicQuery,
	ConfectQueryCtx,
} from "../client/confectPublic";

export const getTagsForThread = confectPublicQuery({
	args: Schema.Struct({
		threadId: Schema.String,
	}),
	returns: Schema.Array(Schema.BigIntFromSelf),
	handler: ({ threadId }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectQueryCtx;
			const threadIdBigInt = BigInt(threadId);
			const tags = yield* Effect.promise(() =>
				getManyFrom(ctx.db, "threadTags", "by_threadId", threadIdBigInt),
			);
			return tags.map((t) => t.tagId);
		}),
});

export const getTagsForThreads = confectPublicQuery({
	args: Schema.Struct({
		threadIds: Schema.Array(Schema.String),
	}),
	returns: Schema.Record({
		key: Schema.String,
		value: Schema.Array(Schema.BigIntFromSelf),
	}),
	handler: ({ threadIds }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectQueryCtx;
			const result: Record<string, Array<bigint>> = {};

			for (const threadIdStr of threadIds) {
				const threadId = BigInt(threadIdStr);
				const tags = yield* Effect.promise(() =>
					getManyFrom(ctx.db, "threadTags", "by_threadId", threadId),
				);
				result[threadIdStr] = tags.map((t) => t.tagId);
			}

			return result;
		}),
});

export const getThreadIdsByTags = confectPublicQuery({
	args: Schema.Struct({
		parentChannelId: Schema.String,
		tagIds: Schema.Array(Schema.String),
		mode: Schema.Union(Schema.Literal("AND"), Schema.Literal("OR")),
	}),
	returns: Schema.Array(Schema.String),
	handler: ({ parentChannelId, tagIds, mode }) =>
		Effect.gen(function* () {
			if (tagIds.length === 0) {
				return [];
			}

			const { db } = yield* ConfectQueryCtx;
			const parentChannelIdBigInt = BigInt(parentChannelId);
			const tagIdsBigInt = [...tagIds].map((id) => BigInt(id));

			const threadIdSets = yield* Effect.all(
				tagIdsBigInt.map((tagId) =>
					Effect.gen(function* () {
						const entries = yield* db
							.query("threadTags")
							.withIndex("by_parentChannelId_and_tagId", (q) =>
								q
									.eq("parentChannelId", parentChannelIdBigInt)
									.eq("tagId", tagId),
							)
							.collect();
						return new Set([...entries].map((e) => e.threadId.toString()));
					}),
				),
			);

			if (mode === "OR") {
				const union = new Set<string>();
				for (const set of threadIdSets) {
					for (const id of set) {
						union.add(id);
					}
				}
				return Array.from(union);
			}

			const firstSet = threadIdSets[0];
			if (!firstSet) {
				return [];
			}
			let intersection = firstSet;
			for (let i = 1; i < threadIdSets.length; i++) {
				const currentSet = threadIdSets[i];
				if (!currentSet) continue;
				intersection = new Set(
					Arr.filter(Array.from(intersection), (id) => currentSet.has(id)),
				);
			}
			return Array.from(intersection);
		}),
});
