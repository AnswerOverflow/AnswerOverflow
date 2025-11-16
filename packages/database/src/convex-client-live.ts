import { ConvexClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import { Config, Context, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api";
import {
	type ConvexClientShared,
	ConvexClientUnified,
	ConvexError,
	type WrappedUnifiedClient,
} from "./convex-unified-client";

const createLiveService = Effect.gen(function* () {
	const convexUrl = yield* Config.string("CONVEX_URL");

	const client = new ConvexClient(convexUrl);

	// Wrap mutation to prevent internal mutations from being called
	// All other methods (query, action, onUpdate) are used directly from ConvexClient
	const wrappedClient: ConvexClientShared = {
		query: client.query.bind(client),
		mutation: <Mutation extends FunctionReference<"mutation">>(
			mutation: Mutation,
			args: Parameters<ConvexClient["mutation"]>[1],
			options?: Parameters<ConvexClient["mutation"]>[2],
		) => {
			// Live client can only call public mutations
			// Internal mutations will fail at runtime with a clear error from Convex
			// This is intentional - internal mutations should only be used in test mode
			if (
				typeof mutation === "object" &&
				mutation !== null &&
				"_visibility" in mutation &&
				(mutation as { _visibility?: string })._visibility === "internal"
			) {
				throw new Error(
					"Internal mutations cannot be called from live client. Use test client for internal mutations.",
				);
			}
			return client.mutation(mutation, args, options);
		},
		action: client.action.bind(client),
		onUpdate: client.onUpdate.bind(client),
	};

	const use = <A>(
		fn: (
			client: ConvexClientShared,
			convexApi: {
				api: typeof api;
				internal: typeof internal;
			},
		) => A | Promise<A>,
	) => {
		return Effect.tryPromise({
			async try(): Promise<Awaited<A>> {
				const result = await fn(wrappedClient, { api, internal });
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

	return { use, client: wrappedClient };
});

export class ConvexClientLive extends Context.Tag("ConvexClientLive")<
	ConvexClientLive,
	Effect.Effect.Success<typeof createLiveService>
>() {}

const ConvexClientLiveSharedLayer = Layer.effectContext(
	Effect.gen(function* () {
		const service = yield* createLiveService;
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
