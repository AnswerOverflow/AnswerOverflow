import { describe, expect, it } from "@effect/vitest";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import * as Effect from "effect/Effect";
import { createConvexOtelTestLayer } from "./convex-effect-otel";
import { ConvexLogSpanExporter } from "./convex-exporter";
import { decodeSpan } from "./span-schema";

it("ConvexLogSpanExporter exports spans as JSON via console.log", () => {
	const exporter = new ConvexLogSpanExporter();
	const logs: string[] = [];
	const originalLog = console.log;

	// Capture console.log calls
	console.log = (...args: unknown[]) => {
		logs.push(args.map((arg) => String(arg)).join(" "));
	};

	try {
		// Create a mock span
		const mockSpan = {
			spanContext: () => ({
				traceId: "12345678901234567890123456789012",
				spanId: "1234567890123456",
			}),
			parentSpanContext: undefined,
			name: "test.span",
			startTime: [1234567890, 123456789] as [number, number],
			endTime: [1234567890, 623456789] as [number, number],
			duration: [0, 500000000] as [number, number],
			attributes: { key: "value", number: 42 },
			status: { code: 1 },
			events: [],
			links: [],
			kind: 0,
		};

		exporter.export([mockSpan as unknown as ReadableSpan], () => {});

		expect(logs).toHaveLength(1);
		const firstLog = logs[0];
		if (!firstLog) {
			throw new Error("Expected at least one log");
		}
		const parsed = JSON.parse(firstLog);
		const loggedData = decodeSpan(parsed);

		expect(loggedData).toMatchObject({
			topic: "otel_span",
			traceId: "12345678901234567890123456789012",
			spanId: "1234567890123456",
			name: "test.span",
			attributes: { key: "value", number: 42 },
		});

		// Verify time conversion (HrTime to nanoseconds)
		// startTime: [1234567890, 123456789] = 1234567890123456789 nanoseconds
		expect(loggedData.startTime).toBe("1234567890123456789");
		// endTime: [1234567890, 623456789] = 1234567890623456789 nanoseconds
		expect(loggedData.endTime).toBe("1234567890623456789");
		// duration: [0, 500000000] = 500000000 nanoseconds
		expect(loggedData.duration).toBe("500000000");
	} finally {
		console.log = originalLog;
	}
});

it.scoped("createConvexOtelLayer works with Effect.withSpan", () =>
	Effect.gen(function* () {
		const logs: string[] = [];
		const originalLog = console.log;

		// Capture console.log calls
		console.log = (...args: unknown[]) => {
			logs.push(args.map((arg) => String(arg)).join(" "));
		};

		try {
			const layer = createConvexOtelTestLayer("test-service");

			const program = Effect.gen(function* () {
				yield* Effect.withSpan("test.operation")(Effect.succeed("result"));
			});

			yield* Effect.provide(program, layer);

			// SimpleSpanProcessor exports synchronously, so spans should be logged immediately
			// Find the span log
			const spanLogs = logs
				.map((log) => {
					try {
						const parsed = JSON.parse(log);
						if (parsed.topic === "otel_span") {
							return decodeSpan(parsed);
						}
						return null;
					} catch {
						return null;
					}
				})
				.filter((span): span is NonNullable<typeof span> => span !== null);

			expect(spanLogs.length).toBeGreaterThan(0);

			const spanData = spanLogs[0];
			if (!spanData) {
				throw new Error("Expected at least one span log");
			}
			expect(spanData).toMatchObject({
				topic: "otel_span",
				name: "test.operation",
			});
			expect(spanData.traceId).toBeDefined();
			expect(spanData.spanId).toBeDefined();
			expect(spanData.startTime).toBeDefined();
			expect(spanData.endTime).toBeDefined();
			expect(spanData.duration).toBeDefined();
		} finally {
			console.log = originalLog;
		}
	}),
);

it.scoped("createConvexOtelLayer handles nested spans", () =>
	Effect.gen(function* () {
		const logs: string[] = [];
		const originalLog = console.log;

		// Capture console.log calls
		console.log = (...args: unknown[]) => {
			logs.push(args.map((arg) => String(arg)).join(" "));
		};

		try {
			const layer = createConvexOtelTestLayer("test-service");

			const program = Effect.gen(function* () {
				yield* Effect.withSpan("parent.operation")(
					Effect.gen(function* () {
						yield* Effect.withSpan("child.operation")(Effect.succeed("result"));
						return "result";
					}),
				);
			});

			yield* Effect.provide(program, layer);

			// SimpleSpanProcessor exports synchronously, so spans should be logged immediately
			// Find all span logs
			const spanLogs = logs
				.map((log) => {
					try {
						const parsed = JSON.parse(log);
						if (parsed.topic === "otel_span") {
							return decodeSpan(parsed);
						}
						return null;
					} catch {
						return null;
					}
				})
				.filter((span): span is NonNullable<typeof span> => span !== null);

			expect(spanLogs.length).toBeGreaterThanOrEqual(2);

			const parentSpan = spanLogs.find((s) => s.name === "parent.operation");
			const childSpan = spanLogs.find((s) => s.name === "child.operation");

			expect(parentSpan).toBeDefined();
			expect(childSpan).toBeDefined();

			// Child span should have parentSpanId matching parent's spanId
			expect(childSpan?.parentSpanId).toBe(parentSpan?.spanId);
			expect(childSpan?.traceId).toBe(parentSpan?.traceId);
		} finally {
			console.log = originalLog;
		}
	}),
);

it("ConvexLogSpanExporter shutdown and forceFlush are no-ops", async () => {
	const exporter = new ConvexLogSpanExporter();

	// These should not throw
	await exporter.shutdown();
	await exporter.forceFlush();
});

describe("span-schema validation", () => {
	it("validates attributes with all AttributeValue types", () => {
		const validSpan = {
			topic: "otel_span" as const,
			traceId: "12345678901234567890123456789012",
			spanId: "1234567890123456",
			parentSpanId: undefined,
			name: "test.span",
			startTime: "1234567890123456789",
			endTime: "1234567890623456789",
			duration: "500000000",
			attributes: {
				stringAttr: "value",
				numberAttr: 42,
				booleanAttr: true,
				stringArray: ["a", "b", null],
				numberArray: [1, 2, null],
				booleanArray: [true, false, null],
			},
			status: { code: 1 },
			events: [],
			links: [],
			kind: 0,
		};

		const decoded = decodeSpan(validSpan);
		expect(decoded.attributes).toEqual(validSpan.attributes);
	});

	it("validates SpanStatus with all status codes", () => {
		const statusCodes = [0, 1, 2] as const;
		for (const code of statusCodes) {
			const span = {
				topic: "otel_span" as const,
				traceId: "12345678901234567890123456789012",
				spanId: "1234567890123456",
				name: "test.span",
				startTime: "1234567890123456789",
				endTime: "1234567890623456789",
				duration: "500000000",
				attributes: {},
				status: { code, message: code === 2 ? "error message" : undefined },
				events: [],
				links: [],
				kind: 0,
			};

			const decoded = decodeSpan(span);
			expect(decoded.status.code).toBe(code);
			if (code === 2) {
				expect(decoded.status.message).toBe("error message");
			}
		}
	});

	it("validates TimedEvent with all fields", () => {
		const span = {
			topic: "otel_span" as const,
			traceId: "12345678901234567890123456789012",
			spanId: "1234567890123456",
			name: "test.span",
			startTime: "1234567890123456789",
			endTime: "1234567890623456789",
			duration: "500000000",
			attributes: {},
			status: { code: 1 },
			events: [
				{
					time: [1234567890, 123456789] as [number, number],
					name: "event.name",
					attributes: { key: "value", number: 42 },
					droppedAttributesCount: 0,
				},
			],
			links: [],
			kind: 0,
		};

		const decoded = decodeSpan(span);
		expect(decoded.events).toHaveLength(1);
		expect(decoded.events[0]).toMatchObject({
			time: [1234567890, 123456789],
			name: "event.name",
			attributes: { key: "value", number: 42 },
			droppedAttributesCount: 0,
		});
	});

	it("validates Link with SpanContext", () => {
		const span = {
			topic: "otel_span" as const,
			traceId: "12345678901234567890123456789012",
			spanId: "1234567890123456",
			name: "test.span",
			startTime: "1234567890123456789",
			endTime: "1234567890623456789",
			duration: "500000000",
			attributes: {},
			status: { code: 1 },
			events: [],
			links: [
				{
					context: {
						traceId: "abcdefabcdefabcdefabcdefabcdefab",
						spanId: "abcdefabcdefabcd",
						isRemote: true,
						traceFlags: 1,
						traceState: "key=value",
					},
					attributes: { linkKey: "linkValue" },
					droppedAttributesCount: 0,
				},
			],
			kind: 0,
		};

		const decoded = decodeSpan(span);
		expect(decoded.links).toHaveLength(1);
		expect(decoded.links[0]).toMatchObject({
			context: {
				traceId: "abcdefabcdefabcdefabcdefabcdefab",
				spanId: "abcdefabcdefabcd",
				isRemote: true,
				traceFlags: 1,
				traceState: "key=value",
			},
			attributes: { linkKey: "linkValue" },
			droppedAttributesCount: 0,
		});
	});

	it("validates Link with traceState as empty object (from JSON.stringify)", () => {
		const span = {
			topic: "otel_span" as const,
			traceId: "12345678901234567890123456789012",
			spanId: "1234567890123456",
			name: "test.span",
			startTime: "1234567890123456789",
			endTime: "1234567890623456789",
			duration: "500000000",
			attributes: {},
			status: { code: 1 },
			events: [],
			links: [
				{
					context: {
						traceId: "abcdefabcdefabcdefabcdefabcdefab",
						spanId: "abcdefabcdefabcd",
						traceFlags: 1,
						traceState: {}, // Empty object from JSON.stringify
					},
				},
			],
			kind: 0,
		};

		const decoded = decodeSpan(span);
		expect(decoded.links).toHaveLength(1);
		expect(decoded.links[0]?.context.traceState).toEqual({});
	});

	it("validates optional fields are omitted", () => {
		const span = {
			topic: "otel_span" as const,
			traceId: "12345678901234567890123456789012",
			spanId: "1234567890123456",
			name: "test.span",
			startTime: "1234567890123456789",
			endTime: "1234567890623456789",
			duration: "500000000",
			attributes: {},
			status: { code: 1 },
			events: [
				{
					time: [1234567890, 123456789] as [number, number],
					name: "event.name",
					// No attributes, no droppedAttributesCount
				},
			],
			links: [
				{
					context: {
						traceId: "abcdefabcdefabcdefabcdefabcdefab",
						spanId: "abcdefabcdefabcd",
						traceFlags: 1,
						// No isRemote, no traceState
					},
					// No attributes, no droppedAttributesCount
				},
			],
			kind: 0,
		};

		const decoded = decodeSpan(span);
		expect(decoded.events[0]?.attributes).toBeUndefined();
		expect(decoded.events[0]?.droppedAttributesCount).toBeUndefined();
		expect(decoded.links[0]?.context.isRemote).toBeUndefined();
		expect(decoded.links[0]?.context.traceState).toBeUndefined();
		expect(decoded.links[0]?.attributes).toBeUndefined();
		expect(decoded.links[0]?.droppedAttributesCount).toBeUndefined();
	});

	it("rejects invalid status code", () => {
		const invalidSpan = {
			topic: "otel_span" as const,
			traceId: "12345678901234567890123456789012",
			spanId: "1234567890123456",
			name: "test.span",
			startTime: "1234567890123456789",
			endTime: "1234567890623456789",
			duration: "500000000",
			attributes: {},
			status: { code: 99 }, // Invalid status code
			events: [],
			links: [],
			kind: 0,
		};

		expect(() => decodeSpan(invalidSpan)).toThrow();
	});

	it("rejects invalid HrTime tuple", () => {
		const invalidSpan = {
			topic: "otel_span" as const,
			traceId: "12345678901234567890123456789012",
			spanId: "1234567890123456",
			name: "test.span",
			startTime: "1234567890123456789",
			endTime: "1234567890623456789",
			duration: "500000000",
			attributes: {},
			status: { code: 1 },
			events: [
				{
					time: [1234567890], // Invalid: should be [number, number]
					name: "event.name",
				},
			],
			links: [],
			kind: 0,
		};

		expect(() => decodeSpan(invalidSpan)).toThrow();
	});

	it("rejects invalid attribute value type", () => {
		const invalidSpan = {
			topic: "otel_span" as const,
			traceId: "12345678901234567890123456789012",
			spanId: "1234567890123456",
			name: "test.span",
			startTime: "1234567890123456789",
			endTime: "1234567890623456789",
			duration: "500000000",
			attributes: {
				invalid: { nested: "object" }, // Invalid: objects not allowed
			},
			status: { code: 1 },
			events: [],
			links: [],
			kind: 0,
		};

		expect(() => decodeSpan(invalidSpan)).toThrow();
	});
});
