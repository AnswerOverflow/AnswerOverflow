import * as Resource from "@effect/opentelemetry/Resource";
import * as Cause from "effect/Cause";
import * as Clock from "effect/Clock";
import * as Exit from "effect/Exit";
import type * as LayerType from "effect/Layer";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Tracer from "effect/Tracer";
import { decodeSpan } from "./span-schema";

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
 * Converts Effect span to OpenTelemetry span format for logging
 */
const effectSpanToOtelSpan = (
	span: Tracer.Span,
	serviceName: ServiceName,
): {
	topic: "otel_span";
	traceId: string;
	spanId: string;
	parentSpanId?: string;
	name: string;
	startTime: string;
	endTime: string;
	duration: string;
	attributes: Record<string, unknown>;
	status: { code: number; message?: string };
	events: Array<{
		time: [number, number];
		name: string;
		attributes?: Record<string, unknown>;
	}>;
	links: Array<{
		context: {
			traceId: string;
			spanId: string;
			traceFlags: number;
		};
		attributes?: Record<string, unknown>;
	}>;
	kind: number;
} => {
	const startTimeNs = span.status.startTime;
	const endTimeNs =
		span.status._tag === "Ended"
			? span.status.endTime
			: BigInt(Date.now()) * BigInt(1_000_000);
	// Ensure duration is at least 1 nanosecond to avoid negative duration warnings
	const rawDurationNs = endTimeNs - startTimeNs;
	const durationNs = rawDurationNs <= 0n ? 1n : rawDurationNs;
	// Recalculate endTime from startTime + duration to ensure consistency
	const calculatedEndTimeNs = startTimeNs + durationNs;

	const statusCode =
		span.status._tag === "Ended"
			? Exit.isSuccess(span.status.exit)
				? 1
				: 2
			: 0;
	const statusMessage =
		span.status._tag === "Ended" && Exit.isFailure(span.status.exit)
			? Cause.pretty(span.status.exit.cause)
			: undefined;

	const kindMap: Record<Tracer.SpanKind, number> = {
		internal: 0,
		server: 1,
		client: 2,
		producer: 3,
		consumer: 4,
	};

	return {
		topic: "otel_span" as const,
		traceId: span.traceId,
		spanId: span.spanId,
		parentSpanId: Option.isSome(span.parent)
			? span.parent.value.spanId
			: undefined,
		name: span.name,
		startTime: String(startTimeNs),
		endTime: String(calculatedEndTimeNs),
		duration: String(durationNs),
		attributes: {
			...Object.fromEntries(span.attributes),
			"service.name": serviceName,
		},
		status: {
			code: statusCode,
			...(statusMessage ? { message: statusMessage } : {}),
		},
		events: [],
		links: span.links.map((link) => ({
			context: {
				traceId: link.span.traceId,
				spanId: link.span.spanId,
				traceFlags: 1,
			},
			attributes: link.attributes,
		})),
		kind: kindMap[span.kind],
	};
};

/**
 * Creates an OpenTelemetry layer for use in Convex functions that exports spans via console.log.
 * Uses Effect's portable Tracer.make directly, avoiding all OpenTelemetry SDK dependencies.
 *
 * This is necessary because Convex functions cannot make outbound HTTP requests.
 * Spans are serialized to JSON and logged with topic "otel_span" for easy identification.
 *
 * The logs can be consumed by Convex log streams and forwarded to an OTEL collector via webhook.
 *
 * @param serviceName - The name of the service (e.g., "discord-bot", "main-site", "database")
 */
export const createConvexOtelLayer = (
	serviceName: ServiceName,
): LayerType.Layer<Resource.Resource> => {
	const ResourceLayer = Resource.layer({ serviceName });

	const createTracer = (): Tracer.Tracer => {
		return Tracer.make({
			span(name, parent, context, links, startTime, kind) {
				// Generate IDs
				const spanId = generateSpanId();
				const traceId = Option.isSome(parent)
					? parent.value.traceId
					: generateTraceId();

				// Create mutable state for the span
				let status: Tracer.SpanStatus = {
					_tag: "Started",
					startTime,
				};
				const attributes = new Map<string, unknown>();
				const spanLinks: Tracer.SpanLink[] = links.map((link) => ({
					_tag: "SpanLink" as const,
					span: link.span,
					attributes: link.attributes ?? {},
				}));

				const span: Tracer.Span = {
					_tag: "Span",
					name,
					spanId,
					traceId,
					parent,
					context,
					get status() {
						return status;
					},
					get attributes() {
						return attributes;
					},
					get links() {
						return spanLinks;
					},
					sampled: true,
					kind,
					end(endTime, exit) {
						status = {
							_tag: "Ended",
							endTime,
							exit,
							startTime,
						};
						try {
							const otelSpan = effectSpanToOtelSpan(span, serviceName);
							const decoded = decodeSpan(otelSpan);
							console.log(JSON.stringify(decoded));
						} catch (error) {
							console.error(`[ERROR] Failed to encode span:`, error);
							// Fallback: log raw span data
							console.log(
								JSON.stringify({
									topic: "otel_span",
									traceId: span.traceId,
									spanId: span.spanId,
									name: span.name,
									error: String(error),
								}),
							);
						}
					},
					attribute(key, value) {
						attributes.set(key, value);
					},
					event(_name, _startTime, _attributes) {
						// Events can be added to attributes or handled separately
					},
					addLinks(newLinks) {
						spanLinks.push(
							...newLinks.map((link) => ({
								_tag: "SpanLink" as const,
								span: link.span,
								attributes: link.attributes ?? {},
							})),
						);
					},
				};

				return span;
			},
			context(f, _fiber) {
				return f();
			},
		});
	};

	const TracerLayer = Layer.setTracer(createTracer());

	return Layer.mergeAll(
		ResourceLayer,
		TracerLayer,
		Layer.setClock(Clock.make()),
	);
};

// Generate random hex IDs for spans
const generateSpanId = (): string => {
	return Array.from({ length: 16 }, () =>
		Math.floor(Math.random() * 16).toString(16),
	).join("");
};

const generateTraceId = (): string => {
	return Array.from({ length: 32 }, () =>
		Math.floor(Math.random() * 16).toString(16),
	).join("");
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
