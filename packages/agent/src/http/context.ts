import { ConvexHttpClient } from "convex/browser";

export interface HttpContextConfig {
	convexUrl: string;
	backendAccessToken: string;
}

export function createHttpContext(config: HttpContextConfig) {
	const client = new ConvexHttpClient(config.convexUrl);

	return {
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
	};
}

export type HttpContext = ReturnType<typeof createHttpContext>;
