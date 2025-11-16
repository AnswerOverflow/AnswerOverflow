import type { ActionCtx, MutationCtx, QueryCtx } from "../client";

export async function getAuthIdentity(ctx: QueryCtx | MutationCtx | ActionCtx) {
	return await ctx.auth.getUserIdentity();
}
