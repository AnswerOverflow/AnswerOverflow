import { v } from "convex/values";
import { internalMutation } from "../client";
import { rateLimiter } from "../shared/rateLimiter";

export const checkGitHubCreateIssue = internalMutation({
	args: {
		userId: v.string(),
	},
	returns: v.object({
		ok: v.boolean(),
		retryAfter: v.optional(v.number()),
	}),
	handler: async (ctx, args) => {
		const result = await rateLimiter.limit(ctx, "githubCreateIssue", {
			key: args.userId,
		});
		return {
			ok: result.ok,
			retryAfter: result.retryAfter ?? undefined,
		};
	},
});

export const checkGitHubFetchRepos = internalMutation({
	args: {
		userId: v.string(),
	},
	returns: v.object({
		ok: v.boolean(),
		retryAfter: v.optional(v.number()),
	}),
	handler: async (ctx, args) => {
		const result = await rateLimiter.limit(ctx, "githubFetchRepos", {
			key: args.userId,
		});
		return {
			ok: result.ok,
			retryAfter: result.retryAfter ?? undefined,
		};
	},
});

export const checkChatMessage = internalMutation({
	args: {
		key: v.string(),
	},
	returns: v.object({
		ok: v.boolean(),
		retryAfter: v.optional(v.number()),
	}),
	handler: async (ctx, args) => {
		const result = await rateLimiter.limit(ctx, "chatMessage", {
			key: args.key,
		});
		return {
			ok: result.ok,
			retryAfter: result.retryAfter ?? undefined,
		};
	},
});
