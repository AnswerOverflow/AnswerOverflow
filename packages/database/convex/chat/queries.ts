import { getThreadMetadata as getAgentThreadMetadata } from "@packages/agent";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalMutation, internalQuery } from "../client";
import { resolveServerContext } from "./shared";

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

		const serverContext = await resolveServerContext(
			ctx,
			metadata.serverDiscordId,
		);

		return {
			threadId: metadata.threadId,
			repos: metadata.repos,
			serverContext,
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

export const migrateThreadsToNewUser = internalMutation({
	args: {
		fromUserId: v.string(),
		toUserId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const threads = await ctx.runQuery(
			components.agent.threads.listThreadsByUserId,
			{
				userId: args.fromUserId,
				paginationOpts: { cursor: null, numItems: 1000 },
				order: "desc",
			},
		);

		for (const thread of threads.page) {
			await ctx.runMutation(components.agent.threads.updateThread, {
				threadId: thread._id,
				patch: { userId: args.toUserId },
			});
		}

		return null;
	},
});
