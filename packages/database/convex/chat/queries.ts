import { getThreadMetadata as getAgentThreadMetadata } from "@packages/agent";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalMutation, internalQuery } from "../client";

export const getThreadMetadata = internalQuery({
	args: {
		threadId: v.string(),
	},
	handler: async (ctx, args) => {
		const metadata = await ctx.db
			.query("chatThreadMetadata")
			.withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
			.first();

		if (!metadata) {
			return null;
		}

		return {
			threadId: metadata.threadId,
			repos: metadata.repos,
		};
	},
});

export const getThreadInfo = internalQuery({
	args: {
		threadId: v.string(),
	},
	handler: async (ctx, args) => {
		return getAgentThreadMetadata(ctx, components.agent, {
			threadId: args.threadId,
		});
	},
});

export const getRecentMessages = internalQuery({
	args: {
		threadId: v.string(),
		limit: v.number(),
	},
	handler: async (ctx, args) => {
		const result = await ctx.runQuery(
			components.agent.messages.listMessagesByThreadId,
			{
				threadId: args.threadId,
				order: "asc",
				paginationOpts: { cursor: null, numItems: args.limit },
				excludeToolMessages: true,
			},
		);

		const messages: { role: string; content: string }[] = [];
		for (const msg of result.page) {
			if (!msg.message) continue;
			messages.push({
				role: msg.message.role,
				content:
					typeof msg.message.content === "string"
						? msg.message.content
						: JSON.stringify(msg.message.content),
			});
		}
		return messages;
	},
});

export const updateThreadTitle = internalMutation({
	args: {
		threadId: v.string(),
		title: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.runMutation(components.agent.threads.updateThread, {
			threadId: args.threadId,
			patch: { title: args.title },
		});
		return null;
	},
});

const vAgentStatus = v.union(
	v.literal("idle"),
	v.literal("cloning_repo"),
	v.literal("thinking"),
	v.literal("responding"),
	v.literal("error"),
);

export const updateAgentStatus = internalMutation({
	args: {
		threadId: v.string(),
		status: vAgentStatus,
		error: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const metadata = await ctx.db
			.query("chatThreadMetadata")
			.withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
			.first();

		if (metadata) {
			await ctx.db.patch(metadata._id, {
				agentStatus: args.status,
				agentError: args.error,
			});
		}
		return null;
	},
});
