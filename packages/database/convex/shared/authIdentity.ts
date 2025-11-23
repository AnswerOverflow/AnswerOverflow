import type { ActionCtx, MutationCtx, QueryCtx } from "../client";

export async function getAuthIdentity(ctx: QueryCtx | MutationCtx | ActionCtx) {
	const identity = await ctx.auth.getUserIdentity();

	if (!identity) {
		const isDev =
			process.env.CONVEX_DEPLOYMENT === "dev" || !process.env.CONVEX_DEPLOYMENT;
		if (isDev) {
			const dummySessionId = crypto.randomUUID();
			return {
				type: "anonymous" as const,
				subject: dummySessionId,
				tokenIdentifier: `anonymous:${dummySessionId}`,
				issuer:
					process.env.ANONYMOUS_AUTH_DOMAIN ?? process.env.SITE_URL ?? "dev",
			};
		}
	}

	return identity;
}
