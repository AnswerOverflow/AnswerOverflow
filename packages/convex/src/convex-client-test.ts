import { convexTest, type TestConvex } from "convex-test";
import { Context, Data, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api.js";
import schema from "../convex/schema.js";
import { modules } from "../convex/test.setup.js";

export class ConvexTestError extends Data.TaggedError("ConvexTestError")<{
	cause: unknown;
}> {}

export const createService = () =>
	Effect.gen(function* () {
		const client = convexTest(schema, modules);

		const use = <T>(
			fn: (
				client: TestConvex<typeof schema>,
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
					return new ConvexTestError({ cause });
				},
			}).pipe(Effect.withSpan("use_convex_http_client"));

		return { use, client };
	});

export class ConvexClientTest extends Context.Tag("ConvexClientTest")<
	ConvexClientTest,
	Effect.Effect.Success<ReturnType<typeof createService>>
>() {}

export const ConvexClientTestLayer = Layer.effect(
	ConvexClientTest,
	createService(),
);
