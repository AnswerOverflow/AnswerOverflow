import { assert, omit, pick } from "convex-helpers";
import { paginator } from "convex-helpers/server/pagination";
import { partial } from "convex-helpers/validators";
import { paginationOptsValidator } from "convex/server";
import type { ObjectType } from "convex/values";
import { type ThreadDoc, vThreadDoc } from "../client/index";
import { vPaginationResult } from "../validators";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
	action,
	internalMutation,
	mutation,
	type MutationCtx,
	query,
} from "./_generated/server";
import { deleteMessage } from "./messages";
import { schema, v } from "./schema";
import { deleteStreamsPageForThreadId } from "./streams";

function publicThreadOrNull(thread: Doc<"threads"> | null): ThreadDoc | null {
	if (thread === null) {
		return null;
	}
	return publicThread(thread);
}

function publicThread(thread: Doc<"threads">): ThreadDoc {
	return omit(thread, ["defaultSystemPrompt", "parentThreadIds", "order"]);
}

export const getThread = query({
	args: { threadId: v.id("threads") },
	handler: async (ctx, args) => {
		return publicThreadOrNull(await ctx.db.get(args.threadId));
	},
	returns: v.union(vThreadDoc, v.null()),
});

export const listThreadsByUserId = query({
	args: {
		userId: v.optional(v.string()),
		order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
		paginationOpts: v.optional(paginationOptsValidator),
	},
	handler: async (ctx, args) => {
		const threads = await paginator(ctx.db, schema)
			.query("threads")
			.withIndex("userId", (q) => q.eq("userId", args.userId))
			.order(args.order ?? "desc")
			.paginate(args.paginationOpts ?? { cursor: null, numItems: 100 });
		return {
			...threads,
			page: threads.page.map(publicThread),
		};
	},
	returns: vPaginationResult(vThreadDoc),
});

const vThread = schema.tables.threads.validator;

export const createThread = mutation({
	args: omit(vThread.fields, ["order", "status"]),
	handler: async (ctx, args) => {
		const threadId = await ctx.db.insert("threads", {
			...args,
			status: "active",
		});
		return publicThread((await ctx.db.get(threadId))!);
	},
	returns: vThreadDoc,
});

export const threadFieldsSupportingPatch = [
	"title" as const,
	"summary" as const,
	"status" as const,
	"userId" as const,
];

export const updateThread = mutation({
	args: {
		threadId: v.id("threads"),
		patch: v.object(partial(pick(vThread.fields, threadFieldsSupportingPatch))),
	},
	handler: async (ctx, args) => {
		const thread = await ctx.db.get(args.threadId);
		assert(thread, `Thread ${args.threadId} not found`);
		await ctx.db.patch(args.threadId, args.patch);
		return publicThread((await ctx.db.get(args.threadId))!);
	},
	returns: vThreadDoc,
});

export const searchThreadTitles = query({
	args: {
		query: v.string(),
		userId: v.optional(v.union(v.string(), v.null())),
		limit: v.number(),
	},
	handler: async (ctx, args) => {
		const threads = await ctx.db
			.query("threads")
			.withSearchIndex("title", (q) =>
				args.userId
					? q.search("title", args.query).eq("userId", args.userId ?? undefined)
					: q.search("title", args.query),
			)
			.take(args.limit);
		return threads.map(publicThread);
	},
	returns: v.array(vThreadDoc),
});

// When we expose this, we need to also hide all the messages and steps
// export const archiveThread = mutation({
//   args: { threadId: v.id("threads") },
//   handler: async (ctx, args) => {
//     const thread = await ctx.db.get(args.threadId);
//     assert(thread, `Thread ${args.threadId} not found`);
//     await ctx.db.patch(args.threadId, { status: "archived" });
//     return publicThread((await ctx.db.get(args.threadId))!);
//   },
//   returns: vThreadDoc,
// });

// TODO: delete thread

/**
 * Use this to delete a thread and everything it contains.
 * It will try to delete all pages synchronously.
 * If it times out or fails, you'll have to run it again.
 */
export const deleteAllForThreadIdSync = action({
	args: { threadId: v.id("threads"), limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		let cursor: string | undefined = undefined;
		while (true) {
			const result: DeleteThreadReturns = await ctx.runMutation(
				internal.threads._deletePageForThreadId,
				{ threadId: args.threadId, cursor, limit: args.limit },
			);
			if (result.isDone) {
				break;
			}
			cursor = result.cursor;
		}
		await ctx.runAction(api.streams.deleteAllStreamsForThreadIdSync, {
			threadId: args.threadId,
		});
	},
	returns: v.null(),
});

const deleteThreadArgs = {
	threadId: v.id("threads"),
	cursor: v.optional(v.string()),
	messagesDone: v.optional(v.boolean()),
	streamsDone: v.optional(v.boolean()),
	streamOrder: v.optional(v.number()),
	deltaCursor: v.optional(v.string()),
	limit: v.optional(v.number()),
};
type DeleteThreadArgs = ObjectType<typeof deleteThreadArgs>;
const deleteThreadReturns = {
	cursor: v.string(),
	isDone: v.boolean(),
};
type DeleteThreadReturns = ObjectType<typeof deleteThreadReturns>;

export const _deletePageForThreadId = internalMutation({
	args: deleteThreadArgs,
	handler: deletePageForThreadIdHandler,
	returns: deleteThreadReturns,
});

/**
 * Use this to delete a thread and everything it contains.
 * It will continue deleting pages asynchronously.
 */
export const deleteAllForThreadIdAsync = mutation({
	args: deleteThreadArgs,
	handler: async (ctx, args) => {
		let messagesResult = {
			isDone: args.messagesDone ?? false,
			cursor: args.cursor,
		};
		if (!args.messagesDone) {
			messagesResult = await deletePageForThreadIdHandler(ctx, args);
		}
		let streamResult = {
			isDone: args.streamsDone ?? false,
			streamOrder: args.streamOrder,
			deltaCursor: args.deltaCursor,
		};
		if (!args.streamsDone) {
			streamResult = await deleteStreamsPageForThreadId(ctx, {
				threadId: args.threadId,
				streamOrder: args.streamOrder,
				deltaCursor: args.deltaCursor,
			});
		}
		const isDone = messagesResult.isDone && streamResult.isDone;
		if (!isDone) {
			await ctx.scheduler.runAfter(0, api.threads.deleteAllForThreadIdAsync, {
				threadId: args.threadId,
				cursor: messagesResult.cursor,
				messagesDone: messagesResult.isDone,
				streamsDone: streamResult.isDone,
				streamOrder: streamResult.streamOrder,
				deltaCursor: streamResult.deltaCursor,
			});
		}
		return { isDone };
	},
	returns: v.object({ isDone: v.boolean() }),
});

async function deletePageForThreadIdHandler(
	ctx: MutationCtx,
	args: DeleteThreadArgs,
): Promise<DeleteThreadReturns> {
	const messages = await paginator(ctx.db, schema)
		.query("messages")
		.withIndex("threadId_status_tool_order_stepOrder", (q) =>
			q.eq("threadId", args.threadId),
		)
		.paginate({
			numItems: args.limit ?? 100,
			cursor: args.cursor ?? null,
		});
	await Promise.all(messages.page.map((m) => deleteMessage(ctx, m)));
	if (messages.isDone) {
		const thread = await ctx.db.get(args.threadId);
		if (thread) {
			await ctx.db.delete(args.threadId);
		}
	}
	return {
		cursor: messages.continueCursor,
		isDone: messages.isDone,
	};
}
