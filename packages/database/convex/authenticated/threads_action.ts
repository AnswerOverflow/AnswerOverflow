import type { FunctionReturnType } from "convex/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { guildManagerAction } from "../client/guildManager";
import { threadSummaryAgent } from "../shared/threadSummaryAgent";

type MessagePage = FunctionReturnType<typeof api.public.messages.getMessages>;

export const generateThreadSummary = guildManagerAction({
	args: {
		threadId: v.int64(),
	},
	returns: v.object({
		summary: v.string(),
	}),
	handler: async (ctx, args): Promise<{ summary: string }> => {
		const messages: MessagePage = await ctx.runQuery(
			api.public.messages.getMessages,
			{
				channelId: args.threadId,
				after: 0n,
				paginationOpts: { numItems: 50, cursor: null },
			},
		);

		if (messages.page.length === 0) {
			return { summary: "No messages found in this thread." };
		}

		const conversationText = messages.page
			.map((msg: MessagePage["page"][number]) => {
				const authorName = msg.author?.name ?? "Unknown User";
				const content = msg.message.content || "[No text content]";
				return `${authorName}: ${content}`;
			})
			.join("\n\n");

		const hasSolution = messages.page.some(
			(msg: MessagePage["page"][number]) =>
				msg.solutions && msg.solutions.length > 0,
		);

		const prompt = `Please summarize the following Discord thread conversation${hasSolution ? " (note: this thread has a marked solution)" : ""}:

${conversationText}`;

		const { thread } = await threadSummaryAgent.createThread(ctx);
		const result = await thread.generateText({ prompt });

		return { summary: result.text };
	},
});
