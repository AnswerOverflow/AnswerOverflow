import type { ExportResult } from "@opentelemetry/core";
import { ExportResultCode } from "@opentelemetry/core";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { decodeSpan } from "./span-schema";

/**
 * A custom OpenTelemetry SpanExporter that serializes spans to JSON and logs them via console.log.
 * This is designed for use in Convex functions where outbound HTTP is not allowed.
 * Spans are logged with a "topic": "otel_span" field to make them easy to identify and parse.
 *
 * The logs can be consumed by Convex log streams and forwarded to an OTEL collector via webhook.
 */
export class ConvexLogSpanExporter implements SpanExporter {
	export(
		spans: ReadableSpan[],
		resultCallback: (result: ExportResult) => void,
	): void {
		for (const span of spans) {
			const spanContext = span.spanContext();
			const parentSpanId = span.parentSpanContext?.spanId;
			const startTimeNs =
				BigInt(span.startTime[0]) * BigInt(1_000_000_000) +
				BigInt(span.startTime[1]);
			const endTimeNs =
				BigInt(span.endTime[0]) * BigInt(1_000_000_000) +
				BigInt(span.endTime[1]);
			const durationNs =
				BigInt(span.duration[0]) * BigInt(1_000_000_000) +
				BigInt(span.duration[1]);

			// Convert links to our format, handling TraceState properly
			const links = span.links.map((link) => {
				const context = link.context;
				const traceState = context.traceState
					? context.traceState.serialize()
					: undefined;
				return {
					context: {
						traceId: context.traceId,
						spanId: context.spanId,
						isRemote: context.isRemote,
						traceFlags: context.traceFlags,
						traceState: traceState ?? undefined,
					},
					attributes: link.attributes,
					droppedAttributesCount: link.droppedAttributesCount,
				};
			});

			const spanData = {
				topic: "otel_span" as const,
				traceId: spanContext.traceId,
				spanId: spanContext.spanId,
				parentSpanId,
				name: span.name,
				startTime: String(startTimeNs),
				endTime: String(endTimeNs),
				duration: String(durationNs),
				attributes: span.attributes,
				status: span.status,
				events: span.events.map((event) => ({
					time: event.time,
					name: event.name,
					attributes: event.attributes,
					droppedAttributesCount: event.droppedAttributesCount,
				})),
				links,
				kind: span.kind,
			};
			const decoded = decodeSpan(spanData);
			console.log(JSON.stringify(decoded));
		}
		resultCallback({ code: ExportResultCode.SUCCESS });
	}

	async shutdown(): Promise<void> {
		// No-op: console.log doesn't need cleanup
	}

	async forceFlush(): Promise<void> {
		// No-op: console.log is synchronous
	}
}
