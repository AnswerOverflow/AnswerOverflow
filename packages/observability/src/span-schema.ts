import * as Schema from "effect/Schema";

/**
 * OpenTelemetry AttributeValue can be:
 * - string
 * - number
 * - boolean
 * - Array of strings (with null/undefined which serialize to null)
 * - Array of numbers (with null/undefined which serialize to null)
 * - Array of booleans (with null/undefined which serialize to null)
 */
const AttributeValueSchema = Schema.Union(
	Schema.String,
	Schema.Number,
	Schema.Boolean,
	Schema.Array(Schema.Union(Schema.String, Schema.Null)),
	Schema.Array(Schema.Union(Schema.Number, Schema.Null)),
	Schema.Array(Schema.Union(Schema.Boolean, Schema.Null)),
);

/**
 * OpenTelemetry Attributes is a Record<string, AttributeValue>
 */
const AttributesSchema = Schema.Record({
	key: Schema.String,
	value: AttributeValueSchema,
});

/**
 * OpenTelemetry SpanStatusCode enum: 0 (UNSET), 1 (OK), 2 (ERROR)
 */
const SpanStatusCodeSchema = Schema.Union(
	Schema.Literal(0),
	Schema.Literal(1),
	Schema.Literal(2),
);

/**
 * OpenTelemetry SpanStatus
 */
const SpanStatusSchema = Schema.Struct({
	code: SpanStatusCodeSchema,
	message: Schema.optional(Schema.String),
});

/**
 * OpenTelemetry HrTime is a tuple of [seconds, nanoseconds]
 */
const HrTimeSchema = Schema.Tuple(Schema.Number, Schema.Number);

/**
 * OpenTelemetry TimedEvent
 */
const TimedEventSchema = Schema.Struct({
	time: HrTimeSchema,
	name: Schema.String,
	attributes: Schema.optional(AttributesSchema),
	droppedAttributesCount: Schema.optional(Schema.Number),
});

/**
 * OpenTelemetry SpanContext
 * Note: traceState serializes to {} (empty object) when it exists, or is omitted when undefined
 * We accept string (if manually serialized via serialize() method) or any object (from JSON.stringify)
 */
const SpanContextSchema = Schema.Struct({
	traceId: Schema.String,
	spanId: Schema.String,
	isRemote: Schema.optional(Schema.Boolean),
	traceFlags: Schema.Number,
	traceState: Schema.optional(
		Schema.Union(
			Schema.String,
			Schema.Record({ key: Schema.String, value: Schema.Unknown }),
		),
	),
});

/**
 * OpenTelemetry Link
 */
const LinkSchema = Schema.Struct({
	context: SpanContextSchema,
	attributes: Schema.optional(AttributesSchema),
	droppedAttributesCount: Schema.optional(Schema.Number),
});

/**
 * Schema for OpenTelemetry span data serialized to JSON.
 * This schema defines the structure of spans logged by ConvexLogSpanExporter.
 */
export const ConvexLogSpanSchema = Schema.Struct({
	topic: Schema.Literal("otel_span"),
	traceId: Schema.String,
	spanId: Schema.String,
	parentSpanId: Schema.optional(Schema.String),
	name: Schema.String,
	startTime: Schema.String, // Nanoseconds as string
	endTime: Schema.String, // Nanoseconds as string
	duration: Schema.String, // Nanoseconds as string
	attributes: AttributesSchema,
	status: SpanStatusSchema,
	events: Schema.Array(TimedEventSchema),
	links: Schema.Array(LinkSchema),
	kind: Schema.Number,
});

/**
 * Type inferred from the ConvexLogSpanSchema.
 */
export type ConvexLogSpan = Schema.Schema.Type<typeof ConvexLogSpanSchema>;

/**
 * Encodes a span data object to a JSON-serializable format.
 */
export const encodeSpan = Schema.encodeSync(ConvexLogSpanSchema);

/**
 * Decodes a JSON-serializable object back to a ConvexLogSpan.
 */
export const decodeSpan = Schema.decodeUnknownSync(ConvexLogSpanSchema);
