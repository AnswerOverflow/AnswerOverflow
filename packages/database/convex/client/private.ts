import { v } from "convex/values";
import {
	customAction,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import { action, query } from "../_generated/server";
import { createDataAccessCache } from "../shared/dataAccess";
import { mutation } from "../triggers";

function validateBackendAccessToken(token: string | undefined): void {
	const expectedToken = process.env.BACKEND_ACCESS_TOKEN;

	if (!expectedToken) {
		throw new Error("BACKEND_ACCESS_TOKEN is not configured");
	}

	if (token !== expectedToken) {
		throw new Error(`Invalid BACKEND_ACCESS_TOKEN`);
	}
}

export const privateQuery = customQuery(query, {
	args: {
		backendAccessToken: v.string(),
	},
	input: async (ctx, args) => {
		validateBackendAccessToken(args.backendAccessToken);
		const cache = createDataAccessCache(ctx);
		const { backendAccessToken: _, ...handlerArgs } = args;

		return {
			ctx: { ...ctx, cache },
			args: handlerArgs,
		};
	},
});

export const privateMutation = customMutation(mutation, {
	args: {
		backendAccessToken: v.string(),
	},
	input: async (ctx, args) => {
		validateBackendAccessToken(args.backendAccessToken);
		const cache = createDataAccessCache(ctx);
		const { backendAccessToken: _, ...handlerArgs } = args;

		return {
			ctx: { ...ctx, cache },
			args: handlerArgs,
		};
	},
});

export const privateAction = customAction(action, {
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
