import { ConvexHttpClient } from "convex/browser";
import { Config, Context, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api.js";
import {
	type ConvexClientShared,
	ConvexClientUnified,
	ConvexError,
} from "./convex-unified-client.js";

type HttpConvexClient = ConvexClientShared & ConvexHttpClient;

export const createHttpService = Effect.gen(function* () {
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

export const ConvexClientHttpLayer = Layer.effect(
	ConvexClientHttp,
	createHttpService,
);

export const ConvexClientHttpUnifiedLayer = Layer.effect(
	ConvexClientUnified,
	createHttpService,
);
