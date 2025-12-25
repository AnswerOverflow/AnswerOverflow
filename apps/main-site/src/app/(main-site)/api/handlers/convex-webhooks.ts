import type { Context } from "elysia";

const OTLP_ENDPOINT =
	process.env.OTLP_HTTP_ENDPOINT ?? "http://localhost:4318/v1/traces";

const OTEL_CONSOLE_MARKER = "__OTEL_SPAN__";

type ConvexWebhookEntry = {
	timestamp: number;
	topic: string;
	message?: string;
};

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

type OtlpAnyValue =
	| { stringValue: string }
	| { boolValue: boolean }
	| { intValue: number }
	| { doubleValue: number };

function toOtlpValue(value: unknown): OtlpAnyValue {
	if (typeof value === "boolean") return { boolValue: value };
	if (typeof value === "number" && Number.isInteger(value)) {
		return { intValue: value };
	}
	if (typeof value === "number") return { doubleValue: value };
	return { stringValue: String(value) };
}

function parseSpanFromMessage(message: string): SerializedSpan | null {
	const idx = message.indexOf(OTEL_CONSOLE_MARKER);
	if (idx === -1) return null;

	const jsonPart = message
		.slice(idx + OTEL_CONSOLE_MARKER.length)
		.trim()
		.slice(0, -1);
	if (!jsonPart) return null;

	try {
		const parsed = JSON.parse(jsonPart) as SerializedSpan;
		if (!parsed.traceId || !parsed.spanId || !parsed.name) return null;
		return parsed;
	} catch (err) {
		console.warn("Failed to parse OTEL span JSON from message", err);
		return null;
	}
}

function convertToResourceSpans(spans: SerializedSpan[]) {
	const groups = new Map<
		string,
		{
			resource: Record<string, unknown>;
			scope: SerializedSpan["scope"];
			spans: SerializedSpan[];
		}
	>();

	for (const span of spans) {
		const key = JSON.stringify({
			resource: span.resource,
			scope: span.scope,
		});

		const existing = groups.get(key);
		if (existing) {
			existing.spans.push(span);
		} else {
			groups.set(key, {
				resource: span.resource,
				scope: span.scope,
				spans: [span],
			});
		}
	}

	return {
		resourceSpans: Array.from(groups.values()).map(
			({ resource, scope, spans }) => ({
				resource: {
					attributes: Object.entries(resource).map(([key, value]) => ({
						key,
						value: { stringValue: String(value) },
					})),
				},
				scopeSpans: [
					{
						scope: {
							name: scope.name,
							...(scope.version ? { version: scope.version } : {}),
						},
						spans: spans.map((span) => ({
							traceId: span.traceId.toLowerCase().padStart(32, "0"),
							spanId: span.spanId.toLowerCase().padStart(16, "0"),
							parentSpanId:
								span.parentSpanId && span.parentSpanId.length > 0
									? span.parentSpanId.toLowerCase().padStart(16, "0")
									: undefined,
							name: span.name,
							kind: span.kind,
							startTimeUnixNano: span.startTimeUnixNano,
							endTimeUnixNano: span.endTimeUnixNano,
							attributes: Object.entries(span.attributes).map(
								([key, value]) => ({
									key,
									value: toOtlpValue(value),
								}),
							),
							status: {
								code: span.status.code,
							},
						})),
					},
				],
			}),
		),
	};
}

export async function exportSpansToCollector(resourceSpans: {
	resourceSpans: unknown[];
}) {
	const payload = JSON.stringify(resourceSpans);

	const response = await fetch(OTLP_ENDPOINT, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: payload,
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		console.error("OTLP export failed", {
			status: response.status,
			statusText: response.statusText,
			error: errorText,
		});
		throw new Error(
			`OTLP export failed: ${response.status} ${response.statusText} - ${errorText}`,
		);
	}
}

export async function handleConvexWebhook(c: Context) {
	try {
		const body = (await c.request.json()) as ConvexWebhookEntry[] | unknown;

		if (!Array.isArray(body)) {
			return Response.json(
				{ error: "Expected array of log entries" },
				{ status: 400 },
			);
		}

		const spans: SerializedSpan[] = [];

		for (const entry of body as ConvexWebhookEntry[]) {
			if (!entry.message) continue;
			const span = parseSpanFromMessage(entry.message);
			if (span) spans.push(span);
		}

		if (spans.length === 0) {
			return Response.json({ message: "OK", spansProcessed: 0 });
		}

		const resourceSpans = convertToResourceSpans(spans);
		await exportSpansToCollector(resourceSpans);

		return Response.json({
			message: "OK",
			spansProcessed: spans.length,
		});
	} catch (error: unknown) {
		console.error("Error handling Convex OTEL webhook", error);
		return Response.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
