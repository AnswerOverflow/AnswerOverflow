import { ConvexHttpClient } from "convex/browser";
import type { ActionCtx } from "../client/types";

export interface HttpContextConfig {
	convexUrl: string;
	backendAccessToken: string;
}

export function createHttpContext(config: HttpContextConfig): ActionCtx {
	const client = new ConvexHttpClient(config.convexUrl);

	const ctx = {
		runQuery: <Args extends Record<string, unknown>, Result>(
			query: { _type: "query" },
			args: Args,
		): Promise<Result> => {
			return client.query(query as never, {
				...args,
				backendAccessToken: config.backendAccessToken,
			} as never);
		},

		runMutation: <Args extends Record<string, unknown>, Result>(
			mutation: { _type: "mutation" },
			args: Args,
		): Promise<Result> => {
			return client.mutation(mutation as never, {
				...args,
				backendAccessToken: config.backendAccessToken,
			} as never);
		},

		runAction: <Args extends Record<string, unknown>, Result>(
			action: { _type: "action" },
			args: Args,
		): Promise<Result> => {
			return client.action(action as never, {
				...args,
				backendAccessToken: config.backendAccessToken,
			} as never);
		},

		auth: {
			getUserIdentity: async () => null,
		},

		storage: {
			get: async () => null,
			getUrl: async () => null,
			getMetadata: async () => null,
			store: async () => {
				throw new Error("Storage store not supported in HTTP context");
			},
			generateUploadUrl: async () => {
				throw new Error("Storage uploads not supported in HTTP context");
			},
			delete: async () => {
				throw new Error("Storage deletes not supported in HTTP context");
			},
		},
	};

	return ctx as unknown as ActionCtx;
}

export type HttpContext = ReturnType<typeof createHttpContext>;
