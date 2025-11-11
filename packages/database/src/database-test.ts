import { createOtelTestLayer } from "@packages/observability/otel";
import { Clock, ConfigProvider, Layer } from "effect";
import * as Duration from "effect/Duration";
import {
	ConvexClientTestLayer,
	ConvexClientTestUnifiedLayer,
} from "./convex-client-test";
import { Database, service } from "./database";

// Set BACKEND_ACCESS_TOKEN in process.env for Convex functions that use process.env directly
process.env.BACKEND_ACCESS_TOKEN = "test-backend-access-token";

// Use SimpleSpanProcessor for tests - exports spans immediately when they end
// This avoids TestClock timing issues since spans are exported synchronously
// Provide a real Clock for the NodeSdk so shutdown timeout uses real time
// This allows OTEL to use real time while the rest of the test uses TestClock
const RealClockLayer = Layer.setClock(Clock.make());
const OtelLayer = createOtelTestLayer(
	"database-tests",
	undefined, // Use default OTLP endpoint
	Duration.seconds(5), // Shutdown timeout - uses real time now
).pipe(Layer.provide(RealClockLayer));

// Provide BACKEND_ACCESS_TOKEN for Effect Config system
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
