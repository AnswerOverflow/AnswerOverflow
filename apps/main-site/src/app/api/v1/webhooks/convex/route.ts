import { createOtelLayer } from "@packages/observability/effect-otel";
import {
	RemoteSpanIngest,
	RemoteSpanIngestLive,
} from "@packages/observability/remote-span-ingest";
import {
	type ConvexLogSpan,
	decodeSpan,
} from "@packages/observability/span-schema";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Webhook endpoint to receive Convex log streams
 * This endpoint receives logs from Convex log streams and forwards them to an OTEL collector
 *
 * Configure this URL in your Convex dashboard under Log Streams:
 * http://localhost:3000/api/v1/webhooks/convex
 */

/**
 * Schema for Convex log event structure
 */
const ConvexLogEventSchema = Schema.Struct({
	topic: Schema.String,
	message: Schema.optional(Schema.String),
});

/**
 * Sample payload:
 * [
 *   {
 *     "timestamp": 1763011475385,
 *     "topic": "console",
 *     "function": {
 *       "path": "public/servers:publicGetBiggestServers",
 *       "type": "query",
 *       "cached": false,
 *       "request_id": "b2539062a12f0eb2",
 *       "mutation_queue_length": null,
 *       "mutation_retry_count": null
 *     },
 *     "log_level": "LOG",
 *     "message": "{\"topic\":\"otel_span\",\"traceId\":\"356d97a4701baac5e399ad90e41f686e\",\"spanId\":\"1dc442f27661556a\",\"name\":\"servers.getBiggestServers\",\"startTime\":\"1763011475122000000\",\"endTime\":\"1763011475122000000\",\"duration\":\"0\",\"attributes\":{\"convex.function\":\"publicGetBiggestServers\",\"servers.take\":10},\"status\":{\"code\":1},\"events\":[],\"links\":[],\"kind\":0}",
 *     "is_truncated": false,
 *     "system_code": null,
 *     "convex": {
 *       "deployment_name": "ardent-monitor-56",
 *       "deployment_type": "dev",
 *       "project_name": "answeroverflow",
 *       "project_slug": "answeroverflow"
 *     }
 *   }
 * ]
 */
export async function POST(request: NextRequest) {
	try {
		const rawBody = await request.json();
		const otlpEndpoint =
			process.env.OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces";

		// Decode the array of log events synchronously
		const decodedEvents = Schema.decodeUnknownSync(
			Schema.Array(ConvexLogEventSchema),
		)(rawBody);
		const events = [...decodedEvents];

		// Extract and decode otel_span messages
		const decodedSpans: Array<ConvexLogSpan> = [];
		for (const evt of events) {
			if (evt.topic !== "console" || !evt.message) {
				continue;
			}

			// Convex wraps console.log messages in single quotes, so we need to strip them
			let messageToParse = evt.message;
			if (messageToParse.startsWith("'") && messageToParse.endsWith("'")) {
				messageToParse = messageToParse.slice(1, -1);
			}

			let parsed: unknown;
			try {
				parsed = JSON.parse(messageToParse);
			} catch {
				// Not JSON, skip this message
				continue;
			}

			if (
				typeof parsed !== "object" ||
				parsed === null ||
				!("topic" in parsed) ||
				parsed.topic !== "otel_span"
			) {
				continue;
			}

			try {
				const span = decodeSpan(parsed);
				decodedSpans.push(span);
			} catch (decodeError) {
				console.error("Failed to decode span:", decodeError);
			}
		}

		// Process spans using Effect if we have any
		if (decodedSpans.length > 0) {
			const serviceName = "database";
			const program = Effect.gen(function* () {
				const remoteSpanIngest = yield* RemoteSpanIngest;
				yield* remoteSpanIngest.ingest(decodedSpans);
			}).pipe(
				Effect.provide(
					Layer.mergeAll(
						RemoteSpanIngestLive(otlpEndpoint),
						createOtelLayer(serviceName, otlpEndpoint),
					),
				),
			);

			await Effect.runPromise(program).catch((error) => {
				console.error("Error ingesting spans:", error);
			});
		}

		return NextResponse.json(
			{ success: true, message: "Webhook received and processed" },
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error processing Convex webhook:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
