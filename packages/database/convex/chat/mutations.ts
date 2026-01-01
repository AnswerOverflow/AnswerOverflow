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
import { vModelId, defaultModelId } from "../shared/models";

export const vRepoContext = v.object({
	owner: v.string(),
	repo: v.string(),
	filePath: v.optional(v.string()),
});

export const sendMessage = adminMutation({
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

		if (!threadId) {
			threadId = await createThread(ctx, components.agent, {});

			if (args.repoContext) {
				await ctx.db.insert("chatThreadMetadata", {
					threadId,
					repos: [args.repoContext],
				});
			}
		}

		const { messageId } = await saveMessage(ctx, components.agent, {
			threadId,
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
