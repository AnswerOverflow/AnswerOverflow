import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";

const OTLP_ENDPOINT = "http://localhost:4318/v1/traces";

type ConvexWebhookEntry = {
	timestamp: number;
	topic: string;
	message?: string;
};

async function exportSpans(resourceSpans: { resourceSpans: unknown[] }) {
	const payload = JSON.stringify(resourceSpans);

	console.log("Exporting spans to OTLP", {
		endpoint: OTLP_ENDPOINT,
		resourceSpansCount: resourceSpans.resourceSpans.length,
		payloadSize: payload.length,
	});

	const response = await fetch(OTLP_ENDPOINT, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: payload,
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		console.error("OTLP export failed:", {
			status: response.status,
			statusText: response.statusText,
			error: errorText,
		});
		throw new Error(
			`OTLP export failed: ${response.status} ${response.statusText} - ${errorText}`,
		);
	}
}

type OtlpAnyValue =
	| { stringValue: string }
	| { boolValue: boolean }
	| { intValue: number }
	| { doubleValue: number };

type SpanData = {
	resource: {
		attributes: Record<string, string>;
	};
	instrumentationScope: {
		name: string;
		version?: string | null;
		schemaUrl?: string | null;
	};
	traceId: string;
	name: string;
	id: string; // spanId
	kind: number;
	timestamp: number; // microseconds since epoch
	duration: number; // microseconds
	attributes: Record<string, unknown>;
	status: { code: number };
	events: unknown[];
	links: unknown[];
};

function parseSpanFromMessage(message: string): SpanData | null {
	let raw = message.trim();

	// Only care about our OTEL payloads
	const marker = "__OTEL_SPAN__";
	const markerIndex = raw.indexOf(marker);
	if (markerIndex === -1) return null;

	raw = raw.slice(markerIndex + marker.length);
	// remove the ' from the start and end of the string
	raw = raw.slice(0, -1);

	try {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const parsed = JSON.parse(raw) as any;
		if (
			parsed &&
			typeof parsed === "object" &&
			parsed.traceId &&
			parsed.id &&
			parsed.name
		) {
			return parsed as SpanData;
		}
	} catch (e) {
		console.log("Raw", raw);
		console.warn("Failed to parse OTEL span JSON:", e);
		return null;
	}

	return null;
}

function toOtlpValue(value: unknown): OtlpAnyValue {
	if (typeof value === "boolean") return { boolValue: value };
	if (typeof value === "number" && Number.isInteger(value))
		return { intValue: value };
	if (typeof value === "number") return { doubleValue: value };
	return { stringValue: String(value) };
}

function convertToResourceSpans(spans: SpanData[]) {
	// group by (resource.attributes + instrumentationScope)
	const groups = new Map<
		string,
		{
			resource: SpanData["resource"];
			scope: SpanData["instrumentationScope"];
			spans: SpanData[];
		}
	>();

	for (const span of spans) {
		const key = JSON.stringify({
			resource: span.resource.attributes,
			scope: span.instrumentationScope,
		});

		const existing = groups.get(key);
		if (existing) {
			existing.spans.push(span);
		} else {
			groups.set(key, {
				resource: span.resource,
				scope: span.instrumentationScope,
				spans: [span],
			});
		}
	}

	return {
		resourceSpans: Array.from(groups.values()).map(
			({ resource, scope, spans: scopeSpans }) => ({
				resource: {
					attributes: Object.entries(resource.attributes).map(
						([key, value]) => ({
							key,
							value: { stringValue: String(value) },
						}),
					),
				},
				scopeSpans: [
					{
						scope: {
							name: scope.name,
							version: scope.version ?? undefined,
						},
						spans: scopeSpans.map((span) => {
							// microseconds → nanoseconds using BigInt, then stringify (no Number() precision loss)
							const startNs = BigInt(span.timestamp) * 1000n;
							const durationUs = Math.max(span.duration, 1); // guard zero-duration
							const endNs = startNs + BigInt(durationUs) * 1000n;

							return {
								traceId: span.traceId.toLowerCase().padStart(32, "0"),
								spanId: span.id.toLowerCase().padStart(16, "0"),
								// no parentSpanId: we don't try to infer it
								name: span.name,
								kind: span.kind,
								startTimeUnixNano: startNs.toString(),
								endTimeUnixNano: endNs.toString(),
								attributes: Object.entries(span.attributes).map(([key, v]) => ({
									key,
									value: toOtlpValue(v),
								})),
								status: { code: span.status.code },
							};
						}),
					},
				],
			}),
		),
	};
}

export async function POST(request: NextRequest) {
	return Effect.gen(function* () {
		const body = (yield* Effect.tryPromise({
			try: () => request.json(),
			catch: (error) => new Error(`Failed to parse request body: ${error}`),
		})) as ConvexWebhookEntry[];
		if (!Array.isArray(body)) {
			return yield* Effect.fail(new Error("Expected array of log entries"));
		}

		const spans: SpanData[] = [];

		for (const entry of body) {
			if (!entry.message) continue;
			const span = parseSpanFromMessage(entry.message);
			if (span) spans.push(span);
		}

		console.log("Parsed OTEL spans", {
			entries: body.length,
			spans: spans.length,
		});

		if (!spans.length) {
			return NextResponse.json({ message: "OK", spansProcessed: 0 });
		}

		const resourceSpans = convertToResourceSpans(spans);

		yield* Effect.tryPromise({
			try: () => exportSpans(resourceSpans),
			catch: (error) => new Error(`Failed to export spans: ${error}`),
		});

		return NextResponse.json({ message: "OK", spansProcessed: spans.length });
	})
		.pipe(
			Effect.catchAll((error) =>
				Effect.succeed(
					NextResponse.json({ error: error.message }, { status: 500 }),
				),
			),
		)
		.pipe(Effect.runPromise);
}
