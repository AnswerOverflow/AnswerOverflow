import {
	createThread,
	getThreadMetadata,
	listUIMessages,
	saveMessage,
	syncStreams,
	vStreamArgs,
} from "@packages/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import {
	authenticatedMutation,
	authenticatedQuery,
	type ActionCtx,
	type MutationCtx,
	type QueryCtx,
} from "../client";
import { defaultModelId, vModelId } from "../shared/models";

export const vRepoContext = v.object({
	owner: v.string(),
	repo: v.string(),
	filePath: v.optional(v.string()),
});

async function verifyThreadOwnership(
	ctx: QueryCtx | MutationCtx | ActionCtx,
	threadId: string,
	userId: string,
): Promise<void> {
	const thread = await getThreadMetadata(ctx, components.agent, { threadId });
	if (thread.userId !== userId) {
		throw new Error("You do not have permission to access this thread");
	}
}

export const sendMessage = authenticatedMutation({
	args: {
		threadId: v.optional(v.string()),
		prompt: v.string(),
		repoContext: v.optional(vRepoContext),
		modelId: v.optional(vModelId),
	},
	returns: v.string(),
	handler: async (ctx, args) => {
		let threadId = args.threadId;
		const modelId = args.modelId ?? defaultModelId;
		const userId = args.userId;

		if (threadId) {
			await verifyThreadOwnership(ctx, threadId, userId);
		} else {
			threadId = await createThread(ctx, components.agent, { userId });

			if (args.repoContext) {
				await ctx.db.insert("chatThreadMetadata", {
					threadId,
					repos: [args.repoContext],
				});
			}
		}

		const { messageId } = await saveMessage(ctx, components.agent, {
			threadId,
			userId,
			prompt: args.prompt,
		});

		await ctx.scheduler.runAfter(0, internal.chat.actions.generateResponse, {
			threadId,
			promptMessageId: messageId,
			modelId,
		});

		return threadId;
	},
});

export const listMessages = authenticatedQuery({
	args: {
		threadId: v.string(),
		paginationOpts: paginationOptsValidator,
		streamArgs: vStreamArgs,
	},
	handler: async (ctx, args) => {
		await verifyThreadOwnership(ctx, args.threadId, args.userId);
		const paginated = await listUIMessages(ctx, components.agent, args);
		const streams = await syncStreams(ctx, components.agent, args);
		return { ...paginated, streams };
	},
});

export const listThreads = authenticatedQuery({
	args: {
		paginationOpts: v.optional(paginationOptsValidator),
	},
	handler: async (ctx, args) => {
		return ctx.runQuery(components.agent.threads.listThreadsByUserId, {
			userId: args.userId,
			paginationOpts: args.paginationOpts ?? { cursor: null, numItems: 50 },
			order: "desc",
		});
	},
});

export const deleteThread = authenticatedMutation({
	args: {
		threadId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await verifyThreadOwnership(ctx, args.threadId, args.userId);

		await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, {
			threadId: args.threadId,
		});

		const metadata = await ctx.db
			.query("chatThreadMetadata")
			.withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
			.first();
		if (metadata) {
			await ctx.db.delete(metadata._id);
		}

		return null;
	},
});

export const updateThreadTitle = authenticatedMutation({
	args: {
		threadId: v.string(),
		title: v.string(),
	},
	handler: async (ctx, args) => {
		await verifyThreadOwnership(ctx, args.threadId, args.userId);

		return ctx.runMutation(components.agent.threads.updateThread, {
			threadId: args.threadId,
			patch: { title: args.title },
		});
	},
});
