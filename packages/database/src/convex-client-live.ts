import { ConvexClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import { Context, Duration, Effect, Layer, Ref, Schedule } from "effect";
import { api, internal } from "../convex/_generated/api";
import {
	type ConvexClientShared,
	ConvexClientUnified,
	ConvexError,
	type WrappedUnifiedClient,
} from "./convex-unified-client";

type ConvexClientWithClose = ConvexClientShared & { close: () => void };

const createWrappedClient = (convexUrl: string): ConvexClientWithClose => {
	const client = new ConvexClient(convexUrl);
	return {
		query: client.query.bind(client),
		mutation: <Mutation extends FunctionReference<"mutation">>(
			mutation: Mutation,
			args: Parameters<ConvexClient["mutation"]>[1],
			options?: Parameters<ConvexClient["mutation"]>[2],
		) => client.mutation(mutation, args, options),
		action: client.action.bind(client),
		onUpdate: client.onUpdate.bind(client),
		close: () => client.close(),
	};
};

const createLiveService = Effect.gen(function* () {
	const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
	const clientRef = yield* Ref.make(createWrappedClient(convexUrl));
	const recreateMutex = yield* Effect.makeSemaphore(1);

	const recreateClient = recreateMutex.withPermits(1)(
		Effect.gen(function* () {
			const oldClient = yield* Ref.get(clientRef);
			const newClient = createWrappedClient(convexUrl);
			yield* Ref.set(clientRef, newClient);
			try {
				oldClient.close();
			} catch {
				// Ignore close errors
			}
		}),
	);

	const use = <A>(
		fn: (
			client: ConvexClientShared,
			convexApi: {
				api: typeof api;
				internal: typeof internal;
			},
		) => A | Promise<A>,
	) => {
		const attempt = Effect.gen(function* () {
			const client = yield* Ref.get(clientRef);
			return yield* Effect.tryPromise({
				try: () => Promise.resolve(fn(client, { api, internal })),
				catch: (cause) => new ConvexError({ cause }),
			});
		});

		return attempt.pipe(
			Effect.tapError(() => recreateClient),
			Effect.retry({
				schedule: Schedule.spaced(Duration.millis(200)),
				times: 1,
			}),
			Effect.timeoutFail({
				duration: Duration.seconds(20),
				onTimeout: () =>
					new ConvexError({ cause: new Error("Request timed out after 20s") }),
			}),
			Effect.withSpan("use_convex_live_client"),
		) as Effect.Effect<Awaited<A>, ConvexError>;
	};

	return {
		use,
		clientRef,
	};
});

export class ConvexClientLive extends Context.Tag("ConvexClientLive")<
	ConvexClientLive,
	Effect.Effect.Success<typeof createLiveService>
>() {}

const ConvexClientLiveSharedLayer = Layer.effectContext(
	Effect.gen(function* () {
		const service = yield* createLiveService;
		const clientProxy = new Proxy({} as ConvexClientShared, {
			get(_, prop: keyof ConvexClientShared) {
				const currentClient = Ref.get(service.clientRef).pipe(Effect.runSync);
				return currentClient[prop];
			},
		});
		const unifiedService: WrappedUnifiedClient = {
			client: clientProxy,
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
