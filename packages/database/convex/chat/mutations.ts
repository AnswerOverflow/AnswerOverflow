import { calculateRateLimit } from "@convex-dev/rate-limiter";
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
	anonOrAuthenticatedMutation,
	anonOrAuthenticatedQuery,
	type MutationCtx,
	type QueryCtx,
} from "../client";
import { authComponent } from "../shared/betterAuth";
import { defaultModelId, getModelById, vModelId } from "../shared/models";
import {
	CHAT_MESSAGE_ANON_CONFIG,
	CHAT_MESSAGE_CONFIG,
	rateLimiter,
} from "../shared/rateLimiter";
import { resolveServerContext } from "./shared";

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

export const sendMessage = anonOrAuthenticatedMutation({
	args: {
		threadId: v.optional(v.string()),
		prompt: v.string(),
		repoContext: v.optional(vRepoContext),
		serverDiscordId: v.optional(v.string()),
		modelId: v.optional(vModelId),
	},
	returns: v.string(),
	handler: async (ctx, args) => {
		const userId = args.userId;
		const user = await authComponent.getAuthUser(ctx);
		const isAnonymous = user?.isAnonymous ?? false;

		const modelId = args.modelId ?? defaultModelId;
		const model = getModelById(modelId);

		if (model?.requiresSignIn && isAnonymous) {
			throw new Error(
				`${model.name} requires you to be signed in. Please sign in to use this model.`,
			);
		}

		const rateLimitName = isAnonymous ? "chatMessageAnon" : "chatMessage";
		const rateLimit = await rateLimiter.limit(ctx, rateLimitName, {
			key: userId,
		});
		if (!rateLimit.ok) {
			throw new Error(
				`Rate limit exceeded. Try again in ${Math.ceil((rateLimit.retryAfter ?? 0) / 1000)} seconds.`,
			);
		}

		let threadId = args.threadId;

		if (threadId) {
			const existingThreadId = threadId;
			await verifyThreadOwnership(ctx, existingThreadId, userId);

			const existingMetadata = await ctx.db
				.query("chatThreadMetadata")
				.withIndex("by_threadId", (q) => q.eq("threadId", existingThreadId))
				.first();

			const metadataPatch = args.serverDiscordId
				? { modelId, serverDiscordId: args.serverDiscordId }
				: { modelId };

			if (existingMetadata) {
				await ctx.db.patch(existingMetadata._id, metadataPatch);
			} else {
				await ctx.db.insert("chatThreadMetadata", {
					threadId: existingThreadId,
					...metadataPatch,
				});
			}
		} else {
			threadId = await createThread(ctx, components.agent, { userId });

			await ctx.db.insert("chatThreadMetadata", {
				threadId,
				repos: args.repoContext ? [args.repoContext] : undefined,
				serverDiscordId: args.serverDiscordId,
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

		if (!args.threadId) {
			await ctx.scheduler.runAfter(0, internal.chat.actions.generateTitle, {
				threadId,
			});
		}

		return threadId;
	},
});

export const listMessages = anonOrAuthenticatedQuery({
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

export const listThreads = anonOrAuthenticatedQuery({
	args: {
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const threads = await ctx.runQuery(
			components.agent.threads.listThreadsByUserId,
			{
				userId: args.userId,
				paginationOpts: args.paginationOpts,
				order: "desc",
			},
		);

		const threadsWithMetadata = await Promise.all(
			threads.page.map(async (thread) => {
				const metadata = await ctx.db
					.query("chatThreadMetadata")
					.withIndex("by_threadId", (q) => q.eq("threadId", thread._id))
					.first();
				return {
					...thread,
					repos: metadata?.repos ?? null,
				};
			}),
		);

		return {
			...threads,
			page: threadsWithMetadata,
		};
	},
});

export const deleteThread = anonOrAuthenticatedMutation({
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

export const updateThreadTitle = anonOrAuthenticatedMutation({
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

export const getChatThreadMetadata = anonOrAuthenticatedQuery({
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

		const serverContext = await resolveServerContext(
			ctx,
			metadata?.serverDiscordId,
		);

		return {
			threadId: args.threadId,
			title: thread.title ?? null,
			repos: metadata?.repos ?? null,
			serverContext,
			modelId: metadata?.modelId ?? null,
			agentStatus: metadata?.agentStatus ?? "idle",
			agentError: metadata?.agentError ?? null,
		};
	},
});

export const getChatRateLimitStatus = anonOrAuthenticatedQuery({
	args: {},
	handler: async (ctx, args) => {
		const user = await authComponent.getAuthUser(ctx);
		const isAnonymous = user?.isAnonymous ?? false;

		const config = isAnonymous ? CHAT_MESSAGE_ANON_CONFIG : CHAT_MESSAGE_CONFIG;
		const rateLimitName = isAnonymous ? "chatMessageAnon" : "chatMessage";

		const { value, ts } = await rateLimiter.getValue(ctx, rateLimitName, {
			key: args.userId,
		});

		const now = Date.now();
		const calculated = calculateRateLimit({ value, ts }, config, now, 0);

		const remaining = Math.max(0, Math.floor(calculated.value));

		let resetsAt: number | null = null;
		if (remaining === 0 && calculated.retryAfter) {
			resetsAt = now + calculated.retryAfter;
		}

		return {
			remaining,
			isAnonymous,
			resetsAt,
		};
	},
});
