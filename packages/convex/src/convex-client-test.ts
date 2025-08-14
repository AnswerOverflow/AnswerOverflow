import { convexTest, type TestConvex } from "convex-test";
import { Context, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api.js";
import schema from "../convex/schema.js";
import { modules } from "../convex/test.setup.js";
import {
	type ConvexClientShared,
	ConvexClientUnified,
	ConvexError,
} from "./convex-unified-client.js";

type TestConvexClient = ConvexClientShared & TestConvex<typeof schema>;

export const createTestService = Effect.gen(function* () {
	const client = convexTest(schema, modules);

	const use = <T>(
		fn: (
			client: TestConvexClient,
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
		}).pipe(Effect.withSpan("use_convex_test_client"));

	return { use, client };
});

export class ConvexClientTest extends Context.Tag("ConvexClientTest")<
	ConvexClientTest,
	Effect.Effect.Success<typeof createTestService>
>() {}

export const ConvexClientTestLayer = Layer.effect(
	ConvexClientTest,
	createTestService,
);

export const ConvexClientTestUnifiedLayer = Layer.effect(
	ConvexClientUnified,
	createTestService,
);
