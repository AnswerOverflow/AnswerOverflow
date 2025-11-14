// convex/otel/JsonConsoleSpanExporter.ts
import type { ExportResult } from "@opentelemetry/core";
import { ExportResultCode } from "@opentelemetry/core";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";

export const OTEL_CONSOLE_MARKER = "__OTEL_SPAN__";

type SerializedSpan = {
	traceId: string;
	spanId: string;
	parentSpanId: string | null;
	name: string;
	kind: number;
	startTimeUnixNano: string;
	endTimeUnixNano: string;
	attributes: Record<string, unknown>;
	status: { code: number; message?: string };
	resource: Record<string, unknown>;
	scope: { name: string; version?: string };
};

function hrTimeToNanoseconds(time: [number, number]): bigint {
	// [seconds, nanoseconds] -> total nanoseconds
	return BigInt(time[0]) * 1_000_000_000n + BigInt(time[1]);
}

/**
 * SpanExporter that just console.logs JSON per span with a fixed marker.
 * Convex ships these logs to your webhook, which replays them to OTLP.
 */
export class JsonConsoleSpanExporter implements SpanExporter {
	export(
		spans: ReadableSpan[],
		resultCallback: (result: ExportResult) => void,
	): void {
		try {
			for (const span of spans) {
				const ctx = span.spanContext();
				const start = hrTimeToNanoseconds(span.startTime);
				const end = hrTimeToNanoseconds(span.endTime);

				const payload: SerializedSpan = {
					traceId: ctx.traceId,
					spanId: ctx.spanId,
					parentSpanId: span.parentSpanContext?.spanId ?? null,
					name: span.name,
					kind: span.kind,
					startTimeUnixNano: start.toString(),
					endTimeUnixNano: end.toString(),
					attributes: span.attributes as Record<string, unknown>,
					status: {
						code: span.status.code,
						...(span.status.message ? { message: span.status.message } : {}),
					},
					resource: span.resource.attributes,
					scope: {
						name: span.instrumentationScope.name,
						version: span.instrumentationScope.version,
					},
				};

				// Single, easy-to-parse line
				console.log(OTEL_CONSOLE_MARKER + JSON.stringify(payload));
			}

			resultCallback({ code: ExportResultCode.SUCCESS });
		} catch (err) {
			console.error("JsonConsoleSpanExporter error", err);
			resultCallback({ code: ExportResultCode.FAILED });
		}
	}

	shutdown(): Promise<void> {
		// No flushing / timers – Convex safe
		return Promise.resolve();
	}
}
