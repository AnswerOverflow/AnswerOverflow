/** biome-ignore-all lint/style/noRestrictedImports: chat functions need direct server access */
import {
	createThread,
	saveMessage,
	vStreamArgs,
	listUIMessages,
	syncStreams,
} from "@packages/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalAction, mutation, query } from "../_generated/server";
import { chatAgent } from "./agent";

export const createChatThread = mutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		const threadId = await createThread(ctx, components.agent, {});
		return threadId;
	},
});

export const sendMessage = mutation({
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

		await ctx.scheduler.runAfter(0, internal.chat.mutations.generateResponse, {
			threadId: args.threadId,
			promptMessageId: messageId,
		});

		return null;
	},
});

export const generateResponse = internalAction({
	args: {
		threadId: v.string(),
		promptMessageId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await chatAgent.streamText(
			ctx,
			{ threadId: args.threadId },
			{ promptMessageId: args.promptMessageId },
			{ saveStreamDeltas: true },
		);
		return null;
	},
});

export const listMessages = query({
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
