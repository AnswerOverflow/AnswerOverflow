import { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import { Context, Duration, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api";
import {
	type ConvexClientShared,
	ConvexClientUnified,
	ConvexError,
	type WrappedUnifiedClient,
} from "./convex-unified-client";

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
			args: Parameters<typeof client.mutation>[1],
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
			args: Parameters<typeof client.mutation>[1],
		) => client.mutation(mutation, args),
		action: client.action.bind(client),
		onUpdate: () => noopUnsubscribe,
	};
};

const createHttpService = Effect.gen(function* () {
	const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
	const httpClient = createHttpClient(convexUrl);

	const createAuthenticatedClient = (token: string): ConvexClientShared =>
		createAuthenticatedHttpClient(convexUrl, token);

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
			try: () => Promise.resolve(fn(httpClient, { api, internal })),
			catch: (cause) => new ConvexError({ cause }),
		}).pipe(
			Effect.timeoutFail({
				duration: Duration.seconds(10),
				onTimeout: () =>
					new ConvexError({
						cause: new Error("HTTP request timed out after 10s"),
					}),
			}),
			Effect.withSpan("use_convex_http_client"),
		) as Effect.Effect<Awaited<A>, ConvexError>;
	};

	return {
		use,
		httpClient,
		createAuthenticatedClient,
	};
});

export class ConvexClientHttp extends Context.Tag("ConvexClientHttp")<
	ConvexClientHttp,
	Effect.Effect.Success<typeof createHttpService>
>() {}

const ConvexClientHttpSharedLayer = Layer.effectContext(
	Effect.gen(function* () {
		const service = yield* createHttpService;
		const unifiedService: WrappedUnifiedClient = {
			client: service.httpClient,
			createAuthenticatedClient: service.createAuthenticatedClient,
			use: service.use,
		};
		return Context.make(ConvexClientHttp, service).pipe(
			Context.add(ConvexClientUnified, unifiedService),
		);
	}),
);

export const ConvexClientHttpLayer = Layer.service(ConvexClientHttp).pipe(
	Layer.provide(ConvexClientHttpSharedLayer),
);

export const ConvexClientHttpUnifiedLayer = Layer.service(
	ConvexClientUnified,
).pipe(Layer.provide(ConvexClientHttpSharedLayer));
