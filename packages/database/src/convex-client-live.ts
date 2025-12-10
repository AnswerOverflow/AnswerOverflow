import { ConvexClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import { Context, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api";
import {
	type ConvexClientShared,
	ConvexClientUnified,
	ConvexError,
	type WrappedUnifiedClient,
} from "./convex-unified-client";

const createLiveService = Effect.gen(function* () {
	const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
	const client = new ConvexClient(convexUrl);

	const wrappedClient: ConvexClientShared = {
		query: client.query.bind(client),
		mutation: <Mutation extends FunctionReference<"mutation">>(
			mutation: Mutation,
			args: Parameters<ConvexClient["mutation"]>[1],
			options?: Parameters<ConvexClient["mutation"]>[2],
		) => {
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
