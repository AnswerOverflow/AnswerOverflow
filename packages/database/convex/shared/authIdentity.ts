import type { UserIdentity } from "convex/server";
import type { ActionCtx, MutationCtx, QueryCtx } from "../client";

type AuthIdentity = UserIdentity & {
	// comes from the better-auth plugin
	isAnonymous: boolean;
};

export async function getAuthIdentity(
	ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<AuthIdentity | null> {
	return ctx.auth.getUserIdentity() as Promise<AuthIdentity | null>;
}
