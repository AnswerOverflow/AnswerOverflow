import { ConvexHttpClient } from "convex/browser";
import type {
	FunctionReference,
	FunctionReturnType,
	OptionalRestArgs,
} from "convex/server";
import { convexTest } from "convex-test";
import { Config, Context, Data, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api.js";
import schema from "../convex/schema.js";
import { modules } from "../convex/test.setup.js";

export class ConvexError extends Data.TaggedError("ConvexError")<{
	cause: unknown;
}> {}

type ConvexClients = {
	/**
	 * Call a public or internal query.
	 *
	 * @param query A {@link FunctionReference} for the query.
	 * @param args  An arguments object for the query. If this is omitted,
	 *   the arguments will be `{}`.
	 * @returns A `Promise` of the query's result.
	 */
	query: <Query extends FunctionReference<"query", any>>(
		query: Query,
		...args: OptionalRestArgs<Query>
	) => FunctionReturnType<Query>;
	/**
	 * Call a public or internal mutation.
	 *
	 * @param mutation A {@link FunctionReference} for the mutation.
	 * @param args  An arguments object for the mutation. If this is omitted,
	 *   the arguments will be `{}`.
	 * @returns A `Promise` of the mutation's result.
	 */
	mutation: <Mutation extends FunctionReference<"mutation", any>>(
		mutation: Mutation,
		...args: OptionalRestArgs<Mutation>
	) => FunctionReturnType<Mutation>;
	/**
	 * Call a public or internal action.
	 *
	 * @param action A {@link FunctionReference} for the action.
	 * @param args  An arguments object for the action. If this is omitted,
	 *   the arguments will be `{}`.
	 * @returns A `Promise` of the action's result.
	 */
	action: <Action extends FunctionReference<"action", any>>(
		action: Action,
		...args: OptionalRestArgs<Action>
	) => FunctionReturnType<Action>;
	/**
	 * Read from and write to the mock backend.
	 *
	 * @param func The async function that reads or writes to the mock backend.
	 *   It receives a {@link GenericMutationCtx} as its first argument, enriched
	 *   with the `storage` API available in actions, so it can read and write
	 *   directly to file storage.
	 * @returns A `Promise` of the function's result.
	 */
};

const createHttpService = Effect.gen(function* () {
	const convexUrl = yield* Config.string("CONVEX_URL");

	const client = new ConvexHttpClient(convexUrl);

	const use = <T>(
		fn: (
			client: ConvexClients,
			convexApi: {
				api: typeof api;
				internal: typeof internal;
			},
		) => T,
	) =>
		Effect.tryPromise({
			async try() {
				return fn(client, { api, internal });
			},
			catch(cause) {
				return new ConvexError({ cause });
			},
		}).pipe(Effect.withSpan("use_convex_http_client"));

	return { use, client };
});

const createTestService = Effect.gen(function* () {
	const client = convexTest(schema, modules);

	const use = <T>(
		fn: (
			client: ConvexClients,
			convexApi: {
				api: typeof api;
				internal: typeof internal;
			},
		) => T,
	) =>
		Effect.tryPromise({
			async try() {
				return fn(client, { api, internal });
			},
			catch(cause) {
				return new ConvexError({ cause });
			},
		}).pipe(Effect.withSpan("use_convex_test_client"));

	return { use, client };
});

export class ConvexClient extends Context.Tag("ConvexClientHttp")<
	ConvexClient,
	| Effect.Effect.Success<typeof createHttpService>
	| Effect.Effect.Success<typeof createTestService>
>() {}

export const ConvexClientHttpLayer = Layer.effect(
	ConvexClient,
	createHttpService,
);

export const ConvexClientTestLayer = Layer.effect(
	ConvexClient,
	createTestService,
);
