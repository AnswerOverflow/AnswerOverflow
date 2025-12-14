import "./performance-polyfill";
import * as Resource from "@effect/opentelemetry/Resource";
import * as Tracer from "@effect/opentelemetry/Tracer";
import {
	BasicTracerProvider,
	SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import type * as LayerType from "effect/Layer";
import * as Layer from "effect/Layer";
import { JsonConsoleSpanExporter } from "./json-exporter";

export type ServiceName =
	| "discord-bot"
	| "main-site"
	| "dashboard"
	| "database"
	| "database-tests"
	| "test-service";

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
				(_provider) => Effect.void,
			),
		),
	);

export const createConvexOtelLayer = (
	serviceName: ServiceName,
): LayerType.Layer<Resource.Resource> => {
	const ResourceLayer = Resource.layer({ serviceName });

	const spanProcessor = new SimpleSpanProcessor(new JsonConsoleSpanExporter());

	const TracerProviderLayer = layerTracerProvider(spanProcessor);

	const TracerLayer = Layer.provide(Tracer.layer, TracerProviderLayer);

	return Layer.mergeAll(
		ResourceLayer,
		TracerLayer.pipe(Layer.provide(ResourceLayer)),
		Layer.setClock(Clock.make()),
	);
};

export const createConvexOtelTestLayer = (
	serviceName: ServiceName,
): LayerType.Layer<Resource.Resource> => {
	const RealClockLayer = Layer.setClock(Clock.make());
	return createConvexOtelLayer(serviceName).pipe(
		Layer.provideMerge(RealClockLayer),
	);
};
