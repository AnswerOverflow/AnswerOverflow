import { ConvexHttpClient } from "convex/browser";
import { Config, Context, Data, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api.js";

export class ConvexError extends Data.TaggedError("ConvexError")<{
	cause: unknown;
}> {}

export const createService = () =>
	Effect.gen(function* () {
		const convexUrl = yield* Config.string("CONVEX_URL");

		const client = new ConvexHttpClient(convexUrl);

		const use = <T>(
			fn: (
				client: ConvexHttpClient,
				convexApi: {
					api: typeof api;
					internal: typeof internal;
				},
			) => Promise<T>,
		) =>
			Effect.tryPromise({
				try() {
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
	Effect.Effect.Success<ReturnType<typeof createService>>
>() {}

export const ConvexClientHttpLayer = Layer.effect(
	ConvexClientHttp,
	createService(),
);
