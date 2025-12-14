import { createOtelTestLayer } from "@packages/observability/effect-otel";
import { Clock, ConfigProvider, Layer } from "effect";
import * as Duration from "effect/Duration";
import {
	ConvexClientTestLayer,
	ConvexClientTestUnifiedLayer,
} from "./convex-client-test";
import { Database, service } from "./database";

process.env.BACKEND_ACCESS_TOKEN = "test-backend-access-token";

const RealClockLayer = Layer.setClock(Clock.make());
const OtelLayer = createOtelTestLayer(
	"database-tests",
	undefined, // Use default OTLP endpoint
	Duration.seconds(5), // Shutdown timeout - uses real time now
).pipe(Layer.provide(RealClockLayer));

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
