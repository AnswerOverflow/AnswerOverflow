import { v } from "convex/values";
import { publicInternalMutation, publicInternalQuery } from "../client";

export const createAnonymousSession = publicInternalMutation({
	args: {},
	returns: v.object({
		sessionId: v.string(),
		createdAt: v.number(),
		expiresAt: v.number(),
	}),
	handler: async (ctx) => {
		const sessionId = crypto.randomUUID();
		await ctx.db.insert("anonymousSessions", {
			sessionId: sessionId,
			createdAt: Date.now(),
			expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
		});
		return {
			sessionId: sessionId,
			createdAt: Date.now(),
			expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
		};
	},
});

export const getAnonymousSession = publicInternalQuery({
	args: {
		sessionId: v.string(),
	},
	handler: async (ctx, args) => {
		const anonymousSession = await ctx.db
			.query("anonymousSessions")
			.withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
			.first();
		if (!anonymousSession) {
			return null;
		}
		return anonymousSession;
	},
});
