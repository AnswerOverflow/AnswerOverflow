import { paginator } from "convex-helpers/server/pagination";
import { stream } from "convex-helpers/server/stream";
import { nullable } from "convex-helpers/validators";
import { paginationOptsValidator } from "convex/server";
import type { ObjectType } from "convex/values";
import { vPaginationResult } from "../validators";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	action,
	internalMutation,
	internalQuery,
	mutation,
	type MutationCtx,
	query,
} from "./_generated/server";
import { deleteMessage } from "./messages";
import { deleteStreamsPageForThreadId } from "./streams";
import { schema, v } from "./schema";

// Note: it only searches for users with threads
export const listUsersWithThreads = query({
	args: {
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const results = await stream(ctx.db, schema)
			.query("threads")
			.withIndex("userId", (q) => q.gt("userId", ""))
			.distinct(["userId"])
			.paginate(args.paginationOpts);
		return {
			...results,
			page: results.page.map((t) => t.userId).filter((t): t is string => !!t),
		};
	},
	returns: vPaginationResult(v.string()),
});

export const deleteAllForUserId = action({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		let threadsCursor = null;
		let threadInProgress = null;
		let messagesCursor = null;
		let streamsInProgress = false;
		let streamOrder = undefined;
		let deltaCursor = undefined;
		let isDone = false;
		while (!isDone) {
			const result: DeleteAllReturns = await ctx.runMutation(
				internal.users._deletePageForUserId,
				{
					userId: args.userId,
					messagesCursor,
					threadInProgress,
					threadsCursor,
					streamsInProgress,
					streamOrder,
					deltaCursor,
				},
			);
			messagesCursor = result.messagesCursor;
			threadInProgress = result.threadInProgress;
			threadsCursor = result.threadsCursor;
			streamsInProgress = result.streamsInProgress ?? false;
			streamOrder = result.streamOrder;
			deltaCursor = result.deltaCursor;
			isDone = result.isDone;
		}
	},
	returns: v.null(),
});

export const deleteAllForUserIdAsync = mutation({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const isDone = await deleteAllForUserIdAsyncHandler(ctx, {
			userId: args.userId,
			messagesCursor: null,
			threadsCursor: null,
			threadInProgress: null,
			streamsInProgress: false,
			streamOrder: undefined,
			deltaCursor: undefined,
		});
		return isDone;
	},
	returns: v.boolean(),
});

const deleteAllArgs = {
	userId: v.string(),
	messagesCursor: nullable(v.string()),
	threadsCursor: nullable(v.string()),
	threadInProgress: nullable(v.id("threads")),
	streamsInProgress: v.optional(v.boolean()),
	streamOrder: v.optional(v.number()),
	deltaCursor: v.optional(v.string()),
};
type DeleteAllArgs = ObjectType<typeof deleteAllArgs>;
const deleteAllReturns = {
	threadsCursor: v.string(),
	threadInProgress: nullable(v.id("threads")),
	messagesCursor: nullable(v.string()),
	streamsInProgress: v.optional(v.boolean()),
	streamOrder: v.optional(v.number()),
	deltaCursor: v.optional(v.string()),
	isDone: v.boolean(),
};
type DeleteAllReturns = ObjectType<typeof deleteAllReturns>;

export const _deleteAllForUserIdAsync = internalMutation({
	args: deleteAllArgs,
	handler: deleteAllForUserIdAsyncHandler,
	returns: v.boolean(),
});

async function deleteAllForUserIdAsyncHandler(
	ctx: MutationCtx,
	args: DeleteAllArgs,
): Promise<boolean> {
	const result = await deletePageForUserId(ctx, args);
	if (!result.isDone) {
		await ctx.scheduler.runAfter(0, internal.users._deleteAllForUserIdAsync, {
			userId: args.userId,
			messagesCursor: result.messagesCursor,
			threadsCursor: result.threadsCursor,
			threadInProgress: result.threadInProgress,
			streamsInProgress: result.streamsInProgress ?? false,
			streamOrder: result.streamOrder,
			deltaCursor: result.deltaCursor,
		});
	}
	return result.isDone;
}

export const _deletePageForUserId = internalMutation({
	args: deleteAllArgs,
	handler: deletePageForUserId,
	returns: deleteAllReturns,
});
async function deletePageForUserId(
	ctx: MutationCtx,
	args: DeleteAllArgs,
): Promise<DeleteAllReturns> {
	let threadInProgress: Id<"threads"> | null = args.threadInProgress;
	let threadsCursor: string | null = args.threadsCursor;
	let messagesCursor: string | null = args.messagesCursor;
	let streamsInProgress: boolean = args.streamsInProgress ?? false;
	let streamOrder: number | undefined = args.streamOrder;
	let deltaCursor: string | undefined = args.deltaCursor;

	// Phase 1: Get a thread to work on if we don't have one
	if (!threadsCursor || !threadInProgress) {
		const threads = await paginator(ctx.db, schema)
			.query("threads")
			.withIndex("userId", (q) => q.eq("userId", args.userId))
			.order("desc")
			.paginate({
				numItems: 1,
				cursor: args.threadsCursor ?? null,
			});
		threadsCursor = threads.continueCursor;
		if (threads.page.length > 0) {
			threadInProgress = threads.page[0]!._id;
			messagesCursor = null;
			streamsInProgress = false;
			streamOrder = undefined;
			deltaCursor = undefined;
		} else {
			return {
				isDone: true,
				threadsCursor,
				threadInProgress,
				messagesCursor,
				streamsInProgress,
				streamOrder,
				deltaCursor,
			};
		}
	}

	// Phase 2: Delete messages for the current thread
	if (!streamsInProgress) {
		const messages = await paginator(ctx.db, schema)
			.query("messages")
			.withIndex("threadId_status_tool_order_stepOrder", (q) =>
				q.eq("threadId", threadInProgress!),
			)
			.order("desc")
			.paginate({
				numItems: 100,
				cursor: args.messagesCursor,
			});
		await Promise.all(messages.page.map((m) => deleteMessage(ctx, m)));

		if (messages.isDone) {
			// Messages are done, move to streams deletion phase
			streamsInProgress = true;
			messagesCursor = null;
			streamOrder = undefined;
			deltaCursor = undefined;
		} else {
			messagesCursor = messages.continueCursor;
		}

		return {
			messagesCursor,
			threadsCursor,
			threadInProgress,
			streamsInProgress,
			streamOrder,
			deltaCursor,
			isDone: false,
		};
	}

	// Phase 3: Delete streams for the current thread
	const streamResult = await deleteStreamsPageForThreadId(ctx, {
		threadId: threadInProgress!,
		streamOrder,
		deltaCursor,
	});

	if (streamResult.isDone) {
		// Streams are done, delete the thread and reset for next thread
		await ctx.db.delete(threadInProgress);
		threadInProgress = null;
		messagesCursor = null;
		streamsInProgress = false;
		streamOrder = undefined;
		deltaCursor = undefined;
	} else {
		// Continue with streams deletion
		streamOrder = streamResult.streamOrder;
		deltaCursor = streamResult.deltaCursor;
	}

	return {
		messagesCursor,
		threadsCursor,
		threadInProgress,
		streamsInProgress,
		streamOrder,
		deltaCursor,
		isDone: false,
	};
}

export const getThreadUserId = internalQuery({
	args: {
		threadId: v.id("threads"),
	},
	returns: v.union(v.string(), v.null()),
	handler: async (ctx, args) => {
		const thread = await ctx.db.get(args.threadId);
		return thread?.userId ?? null;
	},
});
