import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Effect, Predicate, Schema } from "effect";
import { Id, PaginationOpts } from "@packages/confect/server";
import { ConfectQueryCtx, internalQuery } from "../confect";

export const threadMissingRootMessageValidator = v.object({
	threadId: v.int64(),
	threadConvexId: v.id("channels"),
	serverId: v.int64(),
	parentChannelId: v.optional(v.int64()),
});

const ThreadMissingRootMessageSchema = Schema.Struct({
	threadId: Schema.BigIntFromSelf,
	threadConvexId: Id.Id("channels"),
	serverId: Schema.BigIntFromSelf,
	parentChannelId: Schema.optional(Schema.BigIntFromSelf),
});

export type ThreadMissingRootMessage = Schema.Schema.Type<
	typeof ThreadMissingRootMessageSchema
>;

const FindThreadsMissingRootMessagePageResult = Schema.Struct({
	threadsWithMissingRootMessage: Schema.Array(ThreadMissingRootMessageSchema),
	channelsProcessed: Schema.Number,
	isDone: Schema.Boolean,
	continueCursor: Schema.String,
});

export const findThreadsMissingRootMessagePage = internalQuery({
	args: Schema.Struct({
		paginationOpts: PaginationOpts.PaginationOpts,
		threadType: Schema.Number,
	}),
	returns: FindThreadsMissingRootMessagePageResult,
	handler: ({ paginationOpts, threadType }) =>
		Effect.gen(function* () {
			const { ctx, db } = yield* ConfectQueryCtx;

			const paginatedChannels = yield* db
				.query("channels")
				.withIndex("by_type", (q) => q.eq("type", threadType))
				.paginate(paginationOpts);

			const results = yield* Effect.promise(() =>
				asyncMap(paginatedChannels.page, async (channel) => {
					const rootMessage = await getOneFrom(
						ctx.db,
						"messages",
						"by_messageId",
						channel.id,
						"id",
					);

					if (!rootMessage) {
						return {
							threadId: channel.id,
							threadConvexId: channel._id,
							serverId: channel.serverId,
							parentChannelId: channel.parentId,
						};
					}
					return null;
				}),
			);

			const threadsWithMissingRootMessage = Arr.filter(
				results,
				Predicate.isNotNull,
			);

			return {
				threadsWithMissingRootMessage,
				channelsProcessed: paginatedChannels.page.length,
				isDone: paginatedChannels.isDone,
				continueCursor: paginatedChannels.continueCursor,
			};
		}),
});
