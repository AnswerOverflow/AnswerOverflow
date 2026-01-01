import {
	createThread,
	listUIMessages,
	saveMessage,
	syncStreams,
	vStreamArgs,
} from "@packages/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { adminMutation, adminQuery } from "../client";

export const vRepoContext = v.object({
	owner: v.string(),
	repo: v.string(),
	filePath: v.optional(v.string()),
});

export const createChatThread = adminMutation({
	args: {
		repoContext: v.optional(vRepoContext),
	},
	returns: v.string(),
	handler: async (ctx, args) => {
		const threadId = await createThread(ctx, components.agent, {});

		if (args.repoContext) {
			await ctx.db.insert("chatThreadMetadata", {
				threadId,
				repos: [args.repoContext],
			});
		}

		return threadId;
	},
});

export const sendMessage = adminMutation({
	args: {
		threadId: v.string(),
		prompt: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { messageId } = await saveMessage(ctx, components.agent, {
			threadId: args.threadId,
			prompt: args.prompt,
		});

		await ctx.scheduler.runAfter(0, internal.chat.actions.generateResponse, {
			threadId: args.threadId,
			promptMessageId: messageId,
		});

		return null;
	},
});

export const sendMessageToNewThread = adminMutation({
	args: {
		threadId: v.string(),
		prompt: v.string(),
		repoContext: v.optional(vRepoContext),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await createThread(ctx, components.agent, { threadId: args.threadId });

		if (args.repoContext) {
			await ctx.db.insert("chatThreadMetadata", {
				threadId: args.threadId,
				repos: [args.repoContext],
			});
		}

		const { messageId } = await saveMessage(ctx, components.agent, {
			threadId: args.threadId,
			prompt: args.prompt,
		});

		await ctx.scheduler.runAfter(0, internal.chat.actions.generateResponse, {
			threadId: args.threadId,
			promptMessageId: messageId,
		});

		return null;
	},
});

export const listMessages = adminQuery({
	args: {
		threadId: v.string(),
		paginationOpts: paginationOptsValidator,
		streamArgs: vStreamArgs,
	},
	handler: async (ctx, args) => {
		const paginated = await listUIMessages(ctx, components.agent, args);
		const streams = await syncStreams(ctx, components.agent, args);
		return { ...paginated, streams };
	},
});
