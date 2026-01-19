import { gateway, generateText } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../client";

export const generateTitle = internalAction({
	args: {
		threadId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const messages = await ctx.runQuery(
			internal.chat.queries.getRecentMessages,
			{ threadId: args.threadId, limit: 4 },
		);

		if (messages.length === 0) {
			return null;
		}

		const conversationContext = messages
			.map((m) => `${m.role}: ${m.content}`)
			.join("\n\n");

		const { text } = await generateText({
			model: gateway("google/gemini-2.5-flash"),
			prompt: `Generate a short, descriptive title (max 50 characters) for this conversation. Return ONLY the title, no quotes or extra text.

Conversation:
${conversationContext}`,
		});

		const title = text.trim().slice(0, 50);

		await ctx.runMutation(internal.chat.queries.updateThreadTitle, {
			threadId: args.threadId,
			title,
		});

		return null;
	},
});
