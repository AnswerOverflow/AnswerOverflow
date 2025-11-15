import { v } from "convex/values";
import {
	customAction,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import { action, mutation, query } from "../_generated/server";

/**
 * Validates the BACKEND_ACCESS_TOKEN against the environment variable.
 * Throws an error if the token is invalid or missing.
 */
function validateBackendAccessToken(token: string | undefined): void {
	const expectedToken = process.env.BACKEND_ACCESS_TOKEN;

	if (!expectedToken) {
		throw new Error("BACKEND_ACCESS_TOKEN not configured in environment");
	}

	if (!token || token !== expectedToken) {
		throw new Error("Invalid BACKEND_ACCESS_TOKEN");
	}
}

/**
 * Custom query builder for public internal queries.
 * These queries are meant to be called by the backend but are public in order to be callable.
 *
 * Usage:
 * ```ts
 * const myInternalQuery = publicInternalQuery({
 *   args: { someArg: v.string() },
 *   handler: async (ctx, args) => {
 *     // Your query logic here - args will only contain { someArg: string }
 *   },
 * });
 * ```
 *
 * The backend must include `backendAccessToken` in the args when calling this query.
 * Example: await ctx.runQuery(api.myModule.myInternalQuery, { backendAccessToken: "...", someArg: "..." })
 */
export const publicInternalQuery = customQuery(query, {
	args: {
		backendAccessToken: v.string(),
	},
	input: async (ctx, args) => {
		// Validate the backend access token
		validateBackendAccessToken(args.backendAccessToken);

		// Extract all args except backendAccessToken
		const { backendAccessToken: _, ...handlerArgs } = args;

		// Return the args without the token
		return {
			ctx,
			args: handlerArgs,
		};
	},
});

/**
 * Custom mutation builder for public internal mutations.
 * These mutations are meant to be called by the backend but are public in order to be callable.
 *
 * Usage:
 * ```ts
 * const myInternalMutation = publicInternalMutation({
 *   args: { someArg: v.string() },
 *   handler: async (ctx, args) => {
 *     // Your mutation logic here - args will only contain { someArg: string }
 *   },
 * });
 * ```
 *
 * The backend must include `backendAccessToken` in the args when calling this mutation.
 * Example: await ctx.runMutation(api.myModule.myInternalMutation, { backendAccessToken: "...", someArg: "..." })
 */
export const publicInternalMutation = customMutation(mutation, {
	args: {
		backendAccessToken: v.string(),
	},
	input: async (ctx, args) => {
		// Validate the backend access token
		validateBackendAccessToken(args.backendAccessToken);

		// Extract all args except backendAccessToken
		const { backendAccessToken: _, ...handlerArgs } = args;

		// Return the args without the token
		return {
			ctx,
			args: handlerArgs,
		};
	},
});

/**
 * Custom action builder for public internal actions.
 * These actions are meant to be called by the backend but are public in order to be callable.
 *
 * Usage:
 * ```ts
 * const myInternalAction = publicInternalAction({
 *   args: { someArg: v.string() },
 *   handler: async (ctx, args) => {
 *     // Your action logic here - args will only contain { someArg: string }
 *   },
 * });
 * ```
 *
 * The backend must include `backendAccessToken` in the args when calling this action.
 * Example: await ctx.runAction(api.myModule.myInternalAction, { backendAccessToken: "...", someArg: "..." })
 */
export const publicInternalAction = customAction(action, {
	args: {
		backendAccessToken: v.string(),
	},
	input: async (ctx, args) => {
		// Validate the backend access token
		validateBackendAccessToken(args.backendAccessToken);

		// Extract all args except backendAccessToken
		const { backendAccessToken: _, ...handlerArgs } = args;

		// Return the args without the token
		return {
			ctx,
			args: handlerArgs,
		};
	},
});
