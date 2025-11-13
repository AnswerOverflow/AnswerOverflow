import * as NodeSdk from "@effect/opentelemetry/NodeSdk";
import * as OtlpTracer from "@effect/opentelemetry/OtlpTracer";
import type * as Resource from "@effect/opentelemetry/Resource";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import * as Duration from "effect/Duration";
import type * as LayerType from "effect/Layer";
import * as Layer from "effect/Layer";

/**
 * Strongly typed service names used for OpenTelemetry instrumentation.
 * These correspond to the main applications and test suites in the codebase.
 */
export type ServiceName =
	| "discord-bot"
	| "main-site"
	| "dashboard"
	| "database"
	| "database-tests"
	| "test-service";

/**
 * Creates an OpenTelemetry layer using Effect's native OTLP tracer that exports traces to Jaeger via OTLP/HTTP.
 * Uses batching for production workloads.
 * The HttpClient dependency is automatically provided using FetchHttpClient.
 *
 * @param serviceName - The name of the service (e.g., "discord-bot", "main-site", "database")
 * @param otlpEndpoint - The OTLP/HTTP endpoint URL (defaults to Jaeger's default: http://localhost:4318/v1/traces)
 * @param exportInterval - How often to export spans (defaults to 5 seconds)
 * @param shutdownTimeout - How long to wait for spans to be exported on shutdown (defaults to 5 seconds)
 */
export const createOtelLayer = (
	serviceName: ServiceName,
	otlpEndpoint = "http://localhost:4318/v1/traces",
	exportInterval: Duration.DurationInput = Duration.seconds(5),
	shutdownTimeout: Duration.DurationInput = Duration.seconds(5),
): LayerType.Layer<never> =>
	OtlpTracer.layer({
		url: otlpEndpoint,
		resource: { serviceName },
		exportInterval,
		shutdownTimeout,
		maxBatchSize: 1000,
	}).pipe(Layer.provide(FetchHttpClient.layer));

/**
 * Creates a test-specific OpenTelemetry layer using SimpleSpanProcessor for immediate export.
 * This avoids TestClock timing issues since spans are exported synchronously when they end.
 * Note: SimpleSpanProcessor initiates HTTP requests immediately but doesn't wait for them.
 * The shutdown timeout ensures pending exports complete before the SDK shuts down.
 *
 * @param serviceName - The name of the service (e.g., "database-tests")
 * @param otlpEndpoint - The OTLP/HTTP endpoint URL (defaults to Jaeger's default: http://localhost:4318/v1/traces)
 * @param shutdownTimeout - How long to wait for spans to be exported on shutdown (defaults to 5 seconds)
 */
export const createOtelTestLayer = (
	serviceName: ServiceName,
	otlpEndpoint = "http://localhost:4318/v1/traces",
	shutdownTimeout: Duration.DurationInput = Duration.seconds(5),
): LayerType.Layer<Resource.Resource> =>
	NodeSdk.layer(() => ({
		resource: { serviceName },
		spanProcessor: new SimpleSpanProcessor(
			new OTLPTraceExporter({
				url: otlpEndpoint,
			}),
		),
		shutdownTimeout,
	}));
