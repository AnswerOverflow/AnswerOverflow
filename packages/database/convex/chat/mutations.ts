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
	type ActionCtx,
	authenticatedMutation,
	authenticatedQuery,
	type MutationCtx,
	type QueryCtx,
} from "../client";
import { defaultModelId, vModelId } from "../shared/models";
import { rateLimiter } from "../shared/rateLimiter";

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
		const userId = args.userId;

		const rateLimit = await rateLimiter.limit(ctx, "chatMessage", {
			key: userId,
		});
		if (!rateLimit.ok) {
			throw new Error(
				`Rate limit exceeded. Try again in ${Math.ceil((rateLimit.retryAfter ?? 0) / 1000)} seconds.`,
			);
		}

		let threadId = args.threadId;
		const modelId = args.modelId ?? defaultModelId;

		if (threadId) {
			const existingThreadId = threadId;
			await verifyThreadOwnership(ctx, existingThreadId, userId);

			const existingMetadata = await ctx.db
				.query("chatThreadMetadata")
				.withIndex("by_threadId", (q) => q.eq("threadId", existingThreadId))
				.first();

			if (existingMetadata) {
				await ctx.db.patch(existingMetadata._id, { modelId });
			} else {
				await ctx.db.insert("chatThreadMetadata", {
					threadId: existingThreadId,
					modelId,
				});
			}
		} else {
			threadId = await createThread(ctx, components.agent, { userId });

			await ctx.db.insert("chatThreadMetadata", {
				threadId,
				repos: args.repoContext ? [args.repoContext] : undefined,
				modelId,
			});
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
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		return ctx.runQuery(components.agent.threads.listThreadsByUserId, {
			userId: args.userId,
			paginationOpts: args.paginationOpts,
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

export const getChatThreadMetadata = authenticatedQuery({
	args: {
		threadId: v.string(),
	},
	handler: async (ctx, args) => {
		const thread = await getThreadMetadata(ctx, components.agent, {
			threadId: args.threadId,
		});
		if (thread.userId !== args.userId) {
			throw new Error("You do not have permission to access this thread");
		}

		const metadata = await ctx.db
			.query("chatThreadMetadata")
			.withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
			.first();

		return {
			threadId: args.threadId,
			title: thread.title ?? null,
			repos: metadata?.repos ?? null,
			modelId: metadata?.modelId ?? null,
			agentStatus: metadata?.agentStatus ?? "idle",
			agentError: metadata?.agentError ?? null,
		};
	},
});
