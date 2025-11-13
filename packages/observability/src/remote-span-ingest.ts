import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { decodedToReadableSpan } from "./remote-span-conversion";
import type { ConvexLogSpan } from "./span-schema";

/**
 * Service for ingesting decoded spans from Convex and exporting them via OTLP.
 * This acts as a sidecar exporter that receives spans from Convex log streams
 * and forwards them to the same OTLP endpoint used by createOtelLayer.
 */
export interface RemoteSpanIngestService {
	ingest: (
		spans: ReadonlyArray<ConvexLogSpan>,
	) => Effect.Effect<void, never, never>;
}

export class RemoteSpanIngest extends Context.Tag("RemoteSpanIngest")<
	RemoteSpanIngest,
	RemoteSpanIngestService
>() {}

/**
 * Creates a Layer that provides RemoteSpanIngest service.
 * Uses the same OTLP endpoint as createOtelLayer for consistency.
 * Service name is extracted from span attributes (set when exported from Convex).
 *
 * @param otlpEndpoint - The OTLP/HTTP endpoint URL (defaults to http://localhost:4318/v1/traces)
 */
export const RemoteSpanIngestLive = (
	otlpEndpoint = "http://localhost:4318/v1/traces",
): Layer.Layer<RemoteSpanIngest, never, never> =>
	Layer.effect(
		RemoteSpanIngest,
		Effect.sync(() => {
			const exporter = new OTLPTraceExporter({ url: otlpEndpoint });
			const processor = new BatchSpanProcessor(exporter);

			const ingest: RemoteSpanIngestService["ingest"] = (spans) =>
				Effect.promise(async () => {
					for (const decoded of spans) {
						// Service name is extracted from span attributes (set when exported from Convex)
						const readable = decodedToReadableSpan(decoded);
						processor.onEnd(readable);
					}
					await processor.forceFlush();
				}).pipe(Effect.catchAll(() => Effect.void));

			return { ingest };
		}),
	);
