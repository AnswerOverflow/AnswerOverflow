import type { SpanContext } from "@opentelemetry/api";
import {
	type Attributes,
	type AttributeValue,
	createTraceState,
	TraceFlags,
} from "@opentelemetry/api";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import type { ConvexLogSpan } from "./span-schema";

/**
 * Converts nanoseconds (as string) to HrTime tuple [seconds, nanoseconds]
 */
function nanosecondsToHrTime(ns: string): [number, number] {
	const bigNs = BigInt(ns);
	const seconds = Number(bigNs / BigInt(1_000_000_000));
	const nanoseconds = Number(bigNs % BigInt(1_000_000_000));
	return [seconds, nanoseconds];
}

/**
 * Creates a SpanContext from ConvexLogSpan data.
 * Uses default traceFlags (SAMPLED) since the main span doesn't store traceFlags.
 */
function createSpanContext(span: ConvexLogSpan): SpanContext {
	return {
		traceId: span.traceId,
		spanId: span.spanId,
		traceFlags: TraceFlags.SAMPLED,
		isRemote: false,
	};
}

/**
 * Converts a decoded ConvexLogSpan to a ReadableSpan for use with OpenTelemetry processors.
 * @param decoded - The decoded ConvexLogSpan
 * @param serviceName - The service name to set in the resource (defaults to "database")
 */
export function decodedToReadableSpan(
	decoded: ConvexLogSpan,
	serviceName?: string,
): ReadableSpan {
	const startTime = nanosecondsToHrTime(decoded.startTime);

	// Calculate duration from endTime - startTime to ensure consistency
	// Convert both to nanoseconds for precise calculation
	const startTimeNs = BigInt(decoded.startTime);
	const endTimeNs = BigInt(decoded.endTime);
	const durationNs = endTimeNs - startTimeNs;

	// Ensure duration is at least 1 nanosecond to avoid negative duration warnings
	const safeDurationNs = durationNs <= 0n ? 1n : durationNs;

	// Recalculate endTime from startTime + safeDuration to ensure consistency
	const calculatedEndTimeNs = startTimeNs + safeDurationNs;
	const endTime = nanosecondsToHrTime(String(calculatedEndTimeNs));
	const duration = nanosecondsToHrTime(String(safeDurationNs));

	// Extract service name from span attributes if not provided
	const resolvedServiceName =
		serviceName ??
		(typeof decoded.attributes["service.name"] === "string"
			? decoded.attributes["service.name"]
			: "database");

	const spanContext = createSpanContext(decoded);

	const parentSpanContext = decoded.parentSpanId
		? {
				traceId: decoded.traceId,
				spanId: decoded.parentSpanId,
				traceFlags: TraceFlags.SAMPLED,
				isRemote: false,
			}
		: undefined;

	// Convert readonly attributes to mutable Attributes
	const convertAttributes = (
		attrs: ConvexLogSpan["attributes"] | undefined,
	): Attributes | undefined => {
		if (!attrs) return undefined;
		const result: Attributes = {};
		for (const [key, value] of Object.entries(attrs)) {
			// Convert readonly arrays to mutable arrays
			if (Array.isArray(value)) {
				result[key] = [...value] as AttributeValue;
			} else {
				result[key] = value as AttributeValue;
			}
		}
		return result;
	};

	// Convert links
	const links = decoded.links.map((link) => {
		const linkTraceState =
			link.context.traceState !== undefined
				? typeof link.context.traceState === "string"
					? createTraceState(link.context.traceState)
					: undefined
				: undefined;

		return {
			context: {
				traceId: link.context.traceId,
				spanId: link.context.spanId,
				traceFlags: link.context.traceFlags,
				traceState: linkTraceState,
				isRemote: link.context.isRemote ?? false,
			},
			attributes: convertAttributes(link.attributes),
			droppedAttributesCount: link.droppedAttributesCount,
		};
	});

	// Convert events - convert readonly tuple to mutable tuple
	const events = decoded.events.map((event) => ({
		time: [event.time[0], event.time[1]] as [number, number],
		name: event.name,
		attributes: convertAttributes(event.attributes),
		droppedAttributesCount: event.droppedAttributesCount,
	}));

	const readableSpan = {
		spanContext: () => spanContext,
		parentSpanContext,
		name: decoded.name,
		startTime,
		endTime,
		duration,
		attributes: convertAttributes(decoded.attributes) ?? {},
		status: decoded.status,
		events,
		links,
		kind: decoded.kind,
		ended: true,
		droppedAttributesCount: 0,
		droppedEventsCount: 0,
		droppedLinksCount: 0,
		resource: {
			attributes: {
				"service.name": resolvedServiceName,
			},
		},
		instrumentationScope: {
			name: "convex",
			version: "1.0.0",
		},
		instrumentationLibrary: {
			name: "convex",
			version: "1.0.0",
		},
	} as unknown as ReadableSpan;

	return readableSpan;
}
