import { ConvexHttpClient } from "convex/browser";
import { Config, Context, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api.js";
import {
	type ConvexClientShared,
	ConvexClientUnified,
	ConvexError,
} from "./convex-unified-client.js";

type HttpConvexClient = ConvexClientShared & ConvexHttpClient;

const createHttpService = Effect.gen(function* () {
	const convexUrl = yield* Config.string("CONVEX_URL");

	const client = new ConvexHttpClient(convexUrl);

	const use = <T>(
		fn: (
			client: HttpConvexClient,
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

export class ConvexClientHttp extends Context.Tag("ConvexClientHttp")<
	ConvexClientHttp,
	Effect.Effect.Success<typeof createHttpService>
>() {}

const ConvexClientHttpSharedLayer = Layer.effectContext(
	Effect.gen(function* () {
		const service = yield* createHttpService;
		return Context.make(ConvexClientHttp, service).pipe(
			Context.add(ConvexClientUnified, service),
		);
	}),
);

export const ConvexClientHttpLayer = Layer.service(ConvexClientHttp).pipe(
	Layer.provide(ConvexClientHttpSharedLayer),
);

export const ConvexClientHttpUnifiedLayer = Layer.service(
	ConvexClientUnified,
).pipe(Layer.provide(ConvexClientHttpSharedLayer));
