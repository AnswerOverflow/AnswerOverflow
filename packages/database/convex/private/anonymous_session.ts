import { v } from "convex/values";
import { privateMutation } from "../client";

export const createAnonymousSession = privateMutation({
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
