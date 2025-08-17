import { convexTest, type TestConvex } from "convex-test";
import { Context, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import {
	type ConvexClientShared,
	ConvexClientUnified,
	ConvexError,
} from "./convex-unified-client";

type TestConvexClient = ConvexClientShared & TestConvex<typeof schema>;

const createTestService = Effect.gen(function* () {
	// making the test client work, .glob is a vite thing i think
	const modules = (import.meta as any).glob("../convex/**/!(*.*.*)*.*s");
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

const ConvexClientTestSharedLayer = Layer.effectContext(
	Effect.gen(function* () {
		const service = yield* createTestService;
		return Context.make(ConvexClientTest, service).pipe(
			Context.add(ConvexClientUnified, service),
		);
	}),
);

export const ConvexClientTestLayer = Layer.service(ConvexClientTest).pipe(
	Layer.provide(ConvexClientTestSharedLayer),
);

export const ConvexClientTestUnifiedLayer = Layer.service(
	ConvexClientUnified,
).pipe(Layer.provide(ConvexClientTestSharedLayer));
