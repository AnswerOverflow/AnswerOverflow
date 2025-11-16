import { v } from "convex/values";
import {
	customAction,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import { action, mutation, query } from "../_generated/server";

function validateBackendAccessToken(token: string | undefined): void {
	const expectedToken = process.env.BACKEND_ACCESS_TOKEN;

	if (!expectedToken) {
		throw new Error("BACKEND_ACCESS_TOKEN not configured in environment");
	}

	if (!token || token !== expectedToken) {
		throw new Error("Invalid BACKEND_ACCESS_TOKEN");
	}
}

export const publicInternalQuery = customQuery(query, {
	args: {
		backendAccessToken: v.string(),
	},
	input: async (ctx, args) => {
		validateBackendAccessToken(args.backendAccessToken);

		const { backendAccessToken: _, ...handlerArgs } = args;

		return {
			ctx,
			args: handlerArgs,
		};
	},
});

export const publicInternalMutation = customMutation(mutation, {
	args: {
		backendAccessToken: v.string(),
	},
	input: async (ctx, args) => {
		validateBackendAccessToken(args.backendAccessToken);

		const { backendAccessToken: _, ...handlerArgs } = args;

		return {
			ctx,
			args: handlerArgs,
		};
	},
});

export const publicInternalAction = customAction(action, {
	args: {
		backendAccessToken: v.string(),
	},
	input: async (ctx, args) => {
		validateBackendAccessToken(args.backendAccessToken);

		const { backendAccessToken: _, ...handlerArgs } = args;

		return {
			ctx,
			args: handlerArgs,
		};
	},
});
