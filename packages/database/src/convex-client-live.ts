import { ConvexClient } from "convex/browser";
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
	OptionalRestArgs,
} from "convex/server";
import { Config, Context, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api";
import {
	type ConvexClientShared,
	ConvexClientUnified,
	ConvexError,
	type WrappedUnifiedClient,
} from "./convex-unified-client";

type LiveConvexClient = ConvexClientShared & ConvexClient;

const createLiveService = Effect.gen(function* () {
	const convexUrl = yield* Config.string("CONVEX_URL");

	const client = new ConvexClient(convexUrl);

	// Create a wrapper that implements ConvexClientShared
	const sharedClient: ConvexClientShared = {
		query: <Query extends FunctionReference<"query">>(
			query: Query,
			...args: OptionalRestArgs<Query>
		) => {
			const queryArgs = (args[0] ?? {}) as FunctionArgs<Query>;
			return client.query(query, queryArgs) as FunctionReturnType<Query>;
		},
		mutation: <
			Mutation extends
				| FunctionReference<"mutation", "public">
				| FunctionReference<"mutation", "internal">,
		>(
			mutation: Mutation,
			...args: OptionalRestArgs<Mutation>
		) => {
			const mutationArgs = (args[0] ?? {}) as FunctionArgs<Mutation>;
			// Live client can only call public mutations
			// Internal mutations will fail at runtime with a clear error from Convex
			// This is intentional - internal mutations should only be used in test mode
			if ("_visibility" in mutation && mutation._visibility === "internal") {
				throw new Error(
					"Internal mutations cannot be called from live client. Use test client for internal mutations.",
				);
			}
			// After the check, TypeScript knows it's a public mutation
			const publicMutation = mutation as FunctionReference<
				"mutation",
				"public"
			>;
			return client.mutation(
				publicMutation,
				mutationArgs,
			) as FunctionReturnType<Mutation>;
		},
		action: <Action extends FunctionReference<"action">>(
			action: Action,
			...args: OptionalRestArgs<Action>
		) => {
			const actionArgs = (args[0] ?? {}) as FunctionArgs<Action>;
			return client.action(action, actionArgs) as FunctionReturnType<Action>;
		},
		onUpdate: <Query extends FunctionReference<"query">>(
			query: Query,
			args: FunctionArgs<Query>,
			callback: (result: FunctionReturnType<Query>) => void,
		) => {
			return client.onUpdate(query, args, callback);
		},
	};

	const use = <A>(
		fn: (
			client: LiveConvexClient,
			convexApi: {
				api: typeof api;
				internal: typeof internal;
			},
		) => A | Promise<A>,
	) => {
		return Effect.tryPromise({
			async try(): Promise<Awaited<A>> {
				// Merge sharedClient methods with the original client
				// Use object spread to create a new object without mutating the original client
				const mergedClient = {
					...client,
					...sharedClient,
				} as LiveConvexClient;
				const result = await fn(mergedClient, { api, internal });
				return result as Awaited<A>;
			},
			catch(cause) {
				return new ConvexError({ cause });
			},
		}).pipe(Effect.withSpan("use_convex_live_client")) as Effect.Effect<
			Awaited<A>,
			ConvexError
		>;
	};

	return { use, client: sharedClient };
});

export class ConvexClientLive extends Context.Tag("ConvexClientLive")<
	ConvexClientLive,
	Effect.Effect.Success<typeof createLiveService>
>() {}

const ConvexClientLiveSharedLayer = Layer.effectContext(
	Effect.gen(function* () {
		const service = yield* createLiveService;
		// Ensure the service matches WrappedUnifiedClient type
		const unifiedService: WrappedUnifiedClient = {
			client: service.client,
			use: service.use,
		};
		return Context.make(ConvexClientLive, service).pipe(
			Context.add(ConvexClientUnified, unifiedService),
		);
	}),
);

export const ConvexClientLiveLayer = Layer.service(ConvexClientLive).pipe(
	Layer.provide(ConvexClientLiveSharedLayer),
);

export const ConvexClientLiveUnifiedLayer = Layer.service(
	ConvexClientUnified,
).pipe(Layer.provide(ConvexClientLiveSharedLayer));

