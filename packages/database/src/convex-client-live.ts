import { ConvexClient, ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import { Context, Duration, Effect, Layer, Ref } from "effect";
import { api, internal } from "../convex/_generated/api";
import {
	type ConvexClientShared,
	ConvexClientUnified,
	ConvexError,
	type WrappedUnifiedClient,
} from "./convex-unified-client";

const isTransientError = (error: ConvexError): boolean => {
	const cause = error.cause;
	if (cause instanceof Error) {
		const message = cause.message.toLowerCase();
		const isTransient =
			message.includes("try again") ||
			message.includes("couldn't be completed") ||
			message.includes("network") ||
			message.includes("connection") ||
			message.includes("websocket") ||
			message.includes("socket") ||
			message.includes("econnreset") ||
			message.includes("econnrefused") ||
			message.includes("timeout") ||
			message.includes("timed out");
		if (isTransient) {
			console.log("Transient error detected, falling back to HTTP:", message);
		}
		return isTransient;
	}
	return false;
};

type ConvexClientWithClose = ConvexClientShared & { close: () => void };

const createWebSocketClient = (convexUrl: string): ConvexClientWithClose => {
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

const noopUnsubscribe = Object.assign(() => {}, {
	unsubscribe: () => {},
	getCurrentValue: () => undefined,
});

const createHttpClient = (convexUrl: string): ConvexClientShared => {
	const client = new ConvexHttpClient(convexUrl);
	return {
		query: client.query.bind(client),
		mutation: <Mutation extends FunctionReference<"mutation">>(
			mutation: Mutation,
			args: Parameters<ConvexClient["mutation"]>[1],
		) => client.mutation(mutation, args),
		action: client.action.bind(client),
		onUpdate: () => noopUnsubscribe,
	};
};

const createAuthenticatedHttpClient = (
	convexUrl: string,
	token: string,
): ConvexClientShared => {
	const client = new ConvexHttpClient(convexUrl);
	client.setAuth(token);
	return {
		query: client.query.bind(client),
		mutation: <Mutation extends FunctionReference<"mutation">>(
			mutation: Mutation,
			args: Parameters<ConvexClient["mutation"]>[1],
		) => client.mutation(mutation, args),
		action: client.action.bind(client),
		onUpdate: () => noopUnsubscribe,
	};
};

const createLiveService = Effect.gen(function* () {
	const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
	const wsClientRef = yield* Ref.make(createWebSocketClient(convexUrl));
	const httpClient = createHttpClient(convexUrl);

	const createAuthenticatedClient = (token: string): ConvexClientShared =>
		createAuthenticatedHttpClient(convexUrl, token);

	const recreateWsClient = Effect.gen(function* () {
		const oldClient = yield* Ref.get(wsClientRef);
		const newClient = createWebSocketClient(convexUrl);
		yield* Ref.set(wsClientRef, newClient);
		try {
			oldClient.close();
		} catch {
			// Ignore close errors
		}
	});

	const use = <A>(
		fn: (
			client: ConvexClientShared,
			convexApi: {
				api: typeof api;
				internal: typeof internal;
			},
		) => A | Promise<A>,
	) => {
		const wsAttempt = Effect.gen(function* () {
			const client = yield* Ref.get(wsClientRef);
			return yield* Effect.tryPromise({
				try: () => Promise.resolve(fn(client, { api, internal })),
				catch: (cause) => new ConvexError({ cause }),
			});
		}).pipe(
			Effect.timeoutFail({
				duration: Duration.seconds(5),
				onTimeout: () =>
					new ConvexError({
						cause: new Error("WebSocket request timed out after 5s"),
					}),
			}),
		);

		const httpFallback = Effect.tryPromise({
			try: () => Promise.resolve(fn(httpClient, { api, internal })),
			catch: (cause) => new ConvexError({ cause }),
		}).pipe(
			Effect.timeoutFail({
				duration: Duration.seconds(20),
				onTimeout: () =>
					new ConvexError({
						cause: new Error("HTTP fallback request timed out after 20s"),
					}),
			}),
			Effect.withSpan("use_convex_http_fallback"),
		);

		return wsAttempt.pipe(
			Effect.tapError((error) =>
				isTransientError(error) ? recreateWsClient : Effect.void,
			),
			Effect.catchIf(isTransientError, () => httpFallback),
			Effect.withSpan("use_convex_live_client"),
		) as Effect.Effect<Awaited<A>, ConvexError>;
	};

	return {
		use,
		wsClientRef,
		createAuthenticatedClient,
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
				const currentClient = Ref.get(service.wsClientRef).pipe(Effect.runSync);
				return currentClient[prop];
			},
		});
		const unifiedService: WrappedUnifiedClient = {
			client: clientProxy,
			createAuthenticatedClient: service.createAuthenticatedClient,
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
