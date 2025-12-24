/** biome-ignore-all lint/style/noRestrictedImports: This is where we put the custom functions so need to consume them */
import { v } from "convex/values";
import {
	customAction,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import { action, query } from "../_generated/server";
import { createDataAccessCache } from "../shared/dataAccess";
import { mutation } from "../triggers";

function validatePublicBackendAccessToken(token: string | undefined): boolean {
	const expectedToken = process.env.PUBLIC_BACKEND_ACCESS_TOKEN;
	if (!token || !expectedToken) {
		return false;
	}

	return token === expectedToken;
}

function validateBackendAccessToken(token: string | undefined): boolean {
	const expectedToken = process.env.BACKEND_ACCESS_TOKEN;
	if (!token || !expectedToken) {
		return false;
	}
	return token === expectedToken;
}

// we'll bring this back later to enforce rate limits but ideally we can do this via firewall rules instead
export const publicQuery = customQuery(query, {
	args: {
		discordAccountId: v.optional(v.string()),
		anonymousSessionId: v.optional(v.string()),
		publicBackendAccessToken: v.optional(v.string()),
		backendAccessToken: v.optional(v.string()),
		type: v.optional(
			v.union(
				v.literal("signed-in"),
				v.literal("anonymous"),
				v.literal("admin"),
			),
		),
		rateLimitKey: v.optional(v.string()),
	},
	input: async (ctx, args) => {
		const isBackendRequest = validatePublicBackendAccessToken(
			args.publicBackendAccessToken,
		);

		const isLegacyBackendRequest = validateBackendAccessToken(
			args.backendAccessToken,
		);

		const cache = createDataAccessCache(ctx);

		if (isBackendRequest || isLegacyBackendRequest) {
			return {
				ctx: { ...ctx, cache },
				args: {
					...args,
					rateLimitKey: "backend",
					type: "admin" as const,
				},
			};
		}

		const rateLimitKey = "none";
		if (!rateLimitKey) {
			throw new Error("Not discord account or anonymous session found");
		}
		return {
			ctx: { ...ctx, cache },
			args: {
				...args,
				rateLimitKey,
				type: "anonymous",
			},
		};
	},
});

export const publicMutation = customMutation(mutation, {
	args: {
		discordAccountId: v.optional(v.string()),
		publicBackendAccessToken: v.optional(v.string()),
		type: v.optional(v.union(v.literal("signed-in"), v.literal("admin"))),
	},
	input: async (ctx, args) => {
		const cache = createDataAccessCache(ctx);
		if (validatePublicBackendAccessToken(args.publicBackendAccessToken)) {
			return {
				ctx: { ...ctx, cache },
				args: {
					...args,
					type: "admin",
				},
			};
		}
		return {
			ctx: { ...ctx, cache },
			args: {
				...args,
				type: "anonymous",
			},
		};
	},
});

export const publicAction = customAction(action, {
	args: {
		discordAccountId: v.optional(v.string()),
		publicBackendAccessToken: v.optional(v.string()),
		type: v.optional(v.union(v.literal("signed-in"), v.literal("admin"))),
	},
	input: async (ctx, args) => {
		if (validatePublicBackendAccessToken(args.publicBackendAccessToken)) {
			return {
				ctx: { ...ctx },
				args: {
					...args,
					type: "admin",
				},
			};
		}

		return {
			ctx,
			args: {
				...args,
				type: "anonymous",
			},
		};
	},
});
