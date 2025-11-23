import { v } from "convex/values";
import {
	customAction,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import { action, mutation, query } from "../_generated/server";

function validateBackendAccessToken(token: string | undefined): void {
	const expectedToken = process.env.BACKEND_ACCESS_TOKEN;
	const isDev =
		process.env.CONVEX_DEPLOYMENT === "dev" || !process.env.CONVEX_DEPLOYMENT;

	if (!expectedToken) {
		throw new Error("BACKEND_ACCESS_TOKEN not configured in environment");
	}

	if (!token) {
		const devHint = isDev
			? " In dev environments, you can use 'TESTING' as the backendAccessToken."
			: "";
		throw new Error(
			`Invalid BACKEND_ACCESS_TOKEN: token is required.${devHint}`,
		);
	}

	if (isDev && token === "TESTING") {
		return;
	}

	if (token !== expectedToken) {
		const devHint = isDev
			? " In dev environments, you can use 'TESTING' as the backendAccessToken."
			: "";
		throw new Error(`Invalid BACKEND_ACCESS_TOKEN.${devHint}`);
	}
}

export const privateQuery = customQuery(query, {
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

export const privateMutation = customMutation(mutation, {
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
