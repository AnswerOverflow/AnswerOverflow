import "./performance-polyfill";
import * as Resource from "@effect/opentelemetry/Resource";
import * as Tracer from "@effect/opentelemetry/Tracer";
import {
	BasicTracerProvider,
	ConsoleSpanExporter,
	SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import type * as LayerType from "effect/Layer";
import * as Layer from "effect/Layer";

/**
 * Strongly typed service names used for OpenTelemetry instrumentation.
 */
export type ServiceName =
	| "discord-bot"
	| "main-site"
	| "dashboard"
	| "database"
	| "database-tests"
	| "test-service";

/**
 * Creates a TracerProvider layer using BasicTracerProvider from the base SDK.
 * This works in v8 runtime (Convex) as it doesn't require Node-specific dependencies.
 */
const layerTracerProvider = (
	spanProcessor: SimpleSpanProcessor,
): LayerType.Layer<Tracer.OtelTracerProvider, never, Resource.Resource> =>
	Layer.scoped(
		Tracer.OtelTracerProvider,
		Effect.flatMap(Resource.Resource, (resource) =>
			Effect.acquireRelease(
				Effect.sync(() => {
					const provider = new BasicTracerProvider({
						resource,
						spanProcessors: [spanProcessor],
					});
					return provider;
				}),
				(_provider) =>
					// Skip cleanup - forceFlush() and shutdown() use setTimeout which Convex doesn't allow
					// SimpleSpanProcessor exports spans synchronously when they end, so no cleanup needed
					// The provider will be garbage collected after the function completes
					Effect.void,
			),
		),
	);

/**
 * Creates an OpenTelemetry layer for use in Convex functions that exports spans via console.dir.
 * Uses the standard OpenTelemetry SDK with ConsoleSpanExporter and SimpleSpanProcessor.
 *
 * This is necessary because Convex functions cannot make outbound HTTP requests.
 * Spans are logged via ConsoleSpanExporter which outputs to console.dir() when spans end.
 *
 * Note: ConsoleSpanExporter uses console.dir() which may format output differently than console.log().
 * Spans are exported synchronously when they end via SimpleSpanProcessor.
 *
 * @param serviceName - The name of the service (e.g., "discord-bot", "main-site", "database")
 */
export const createConvexOtelLayer = (
	serviceName: ServiceName,
): LayerType.Layer<Resource.Resource> => {
	const ResourceLayer = Resource.layer({ serviceName });

	const spanProcessor = new SimpleSpanProcessor(new ConsoleSpanExporter());

	const TracerProviderLayer = layerTracerProvider(spanProcessor);

	const TracerLayer = Layer.provide(Tracer.layer, TracerProviderLayer);

	return Layer.mergeAll(
		ResourceLayer,
		TracerLayer.pipe(Layer.provide(ResourceLayer)),
		Layer.setClock(Clock.make()),
	);
};

/**
 * Creates a test-specific Convex OpenTelemetry layer that provides a real Clock.
 * This is necessary when using TestClock in tests, as the shutdown timeout needs real time.
 * Use this in test files instead of createConvexOtelLayer to avoid TestClock timing issues.
 *
 * @param serviceName - The name of the service (e.g., "test-service")
 */
export const createConvexOtelTestLayer = (
	serviceName: ServiceName,
): LayerType.Layer<Resource.Resource> => {
	const RealClockLayer = Layer.setClock(Clock.make());
	return createConvexOtelLayer(serviceName).pipe(
		Layer.provideMerge(RealClockLayer),
	);
};
