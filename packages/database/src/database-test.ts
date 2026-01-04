import { createNoopOtelTestLayer } from "@packages/observability/effect-otel";
import { ConfigProvider, Layer } from "effect";
import {
	ConvexClientTestLayer,
	ConvexClientTestUnifiedLayer,
} from "./convex-client-test";
import { Database, service } from "./database";

process.env.BACKEND_ACCESS_TOKEN = "test-backend-access-token";

const OtelLayer = createNoopOtelTestLayer("database-tests");

const BackendAccessTokenLayer = Layer.setConfigProvider(
	ConfigProvider.fromJson({
		BACKEND_ACCESS_TOKEN: "test-backend-access-token",
	}),
);

export const DatabaseTestLayer = Layer.mergeAll(
	Layer.effect(Database, service).pipe(
		Layer.provide(ConvexClientTestUnifiedLayer),
		Layer.provide(BackendAccessTokenLayer),
	),
	ConvexClientTestLayer,
	OtelLayer,
);
