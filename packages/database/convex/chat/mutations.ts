import { createMCPClient } from "@ai-sdk/mcp";
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
import { adminMutation, adminQuery, internalAction } from "../client";
import { chatAgent } from "./agent";

export const createChatThread = adminMutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		const threadId = await createThread(ctx, components.agent, {});
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
		const mcpClient = await createMCPClient({
			transport: {
				type: "http",
				url: "https://www.answeroverflow.com/mcp",
			},
		});

		try {
			const mcpTools = await mcpClient.tools();

			await chatAgent.streamText(
				ctx,
				{ threadId: args.threadId },
				{
					promptMessageId: args.promptMessageId,
					tools: { ...chatAgent.options.tools, ...mcpTools },
				},
				{ saveStreamDeltas: true },
			);
		} finally {
			await mcpClient.close();
		}

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
