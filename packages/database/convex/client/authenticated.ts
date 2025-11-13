import { v } from "convex/values";
import {
	customAction,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { action, mutation, query } from "../_generated/server";
import { getDiscordAccountWithToken } from "../shared/auth";

/**
 * Get the authenticated user's Discord account ID from their BetterAuth identity.
 * This is a helper function used by the authenticated wrappers.
 * Returns null if not authenticated or no Discord account linked.
 */
async function getDiscordAccountIdForWrapper(
	ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<string | null> {
	const account = await getDiscordAccountWithToken(ctx);
	return account?.accountId ?? null;
}

/**
 * Custom query builder for authenticated queries.
 * These queries automatically get the authenticated user's Discord account ID.
 * Throws an error if the user is not authenticated or has no Discord account.
 *
 * Usage:
 * ```ts
 * export const myAuthenticatedQuery = authenticatedQuery({
 *   args: { someArg: v.string() },
 *   handler: async (ctx, args) => {
 *     // Your query logic here - args will contain { someArg: string, discordAccountId: string }
 *     // discordAccountId is guaranteed to be a string (not null)
 *   },
 * });
 * ```
 *
 * The handler will receive `discordAccountId` as part of the args.
 * If the user is not authenticated or has no Discord account, an error will be thrown.
 *
 * Note: Callers should NOT include `discordAccountId` in their args - it is automatically added by the wrapper.
 */
export const authenticatedQuery = customQuery(query, {
	args: {
		discordAccountId: v.optional(v.string()),
	},
	input: async (ctx, args) => {
		// Always override discordAccountId with the actual value from auth
		// This ensures callers can't spoof it, and TypeScript knows it's in the args
		const discordAccountId = await getDiscordAccountIdForWrapper(ctx);

		// Throw error if user is not authenticated or has no Discord account
		if (!discordAccountId) {
			throw new Error("Not authenticated or Discord account not linked");
		}

		// Add discordAccountId to the args passed to the handler
		return {
			ctx,
			args: {
				...args,
				discordAccountId,
			},
		};
	},
});

/**
 * Custom mutation builder for authenticated mutations.
 * These mutations automatically get the authenticated user's Discord account ID.
 * Throws an error if the user is not authenticated or has no Discord account.
 *
 * Usage:
 * ```ts
 * export const myAuthenticatedMutation = authenticatedMutation({
 *   args: { someArg: v.string() },
 *   handler: async (ctx, args) => {
 *     // Your mutation logic here - args will contain { someArg: string, discordAccountId: string }
 *     // discordAccountId is guaranteed to be a string (not null)
 *   },
 * });
 * ```
 *
 * The handler will receive `discordAccountId` as part of the args.
 * If the user is not authenticated or has no Discord account, an error will be thrown.
 *
 * Note: Callers should NOT include `discordAccountId` in their args - it is automatically added by the wrapper.
 */
export const authenticatedMutation = customMutation(mutation, {
	args: {
		discordAccountId: v.optional(v.string()),
	},
	input: async (ctx, args) => {
		// Always override discordAccountId with the actual value from auth
		// This ensures callers can't spoof it, and TypeScript knows it's in the args
		const discordAccountId = await getDiscordAccountIdForWrapper(ctx);

		// Throw error if user is not authenticated or has no Discord account
		if (!discordAccountId) {
			throw new Error("Not authenticated or Discord account not linked");
		}

		// Add discordAccountId to the args passed to the handler
		return {
			ctx,
			args: {
				...args,
				discordAccountId,
			},
		};
	},
});

/**
 * Custom action builder for authenticated actions.
 * These actions automatically get the authenticated user's Discord account ID.
 * Throws an error if the user is not authenticated or has no Discord account.
 *
 * Usage:
 * ```ts
 * export const myAuthenticatedAction = authenticatedAction({
 *   args: { someArg: v.string() },
 *   handler: async (ctx, args) => {
 *     // Your action logic here - args will contain { someArg: string, discordAccountId: string }
 *     // discordAccountId is guaranteed to be a string (not null)
 *   },
 * });
 * ```
 *
 * The handler will receive `discordAccountId` as part of the args.
 * If the user is not authenticated or has no Discord account, an error will be thrown.
 *
 * Note: Callers should NOT include `discordAccountId` in their args - it is automatically added by the wrapper.
 */
export const authenticatedAction = customAction(action, {
	args: {
		discordAccountId: v.optional(v.string()),
	},
	input: async (ctx, args) => {
		// Always override discordAccountId with the actual value from auth
		// This ensures callers can't spoof it, and TypeScript knows it's in the args
		const discordAccountId = await getDiscordAccountIdForWrapper(ctx);

		// Throw error if user is not authenticated or has no Discord account
		if (!discordAccountId) {
			throw new Error("Not authenticated or Discord account not linked");
		}

		// Add discordAccountId to the args passed to the handler
		return {
			ctx,
			args: {
				...args,
				discordAccountId,
			},
		};
	},
});
