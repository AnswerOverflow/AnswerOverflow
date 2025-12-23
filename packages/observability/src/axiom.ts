import * as OtlpLogger from "@effect/opentelemetry/OtlpLogger";
import * as OtlpMetrics from "@effect/opentelemetry/OtlpMetrics";
import * as OtlpTracer from "@effect/opentelemetry/OtlpTracer";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as Duration from "effect/Duration";
import * as Layer from "effect/Layer";
import { AxiomMetricsHttpClientLayer } from "./axiom-metrics-protobuf";

export type AxiomConfig = {
	apiToken: string;
	tracesDataset: string;
	logsDataset: string;
	metricsDataset: string;
	domain?: string;
	serviceName: string;
	serviceVersion?: string;
	environment?: string;
	tracesExportInterval?: Duration.DurationInput;
	logsExportInterval?: Duration.DurationInput;
	metricsExportInterval?: Duration.DurationInput;
};

export const createAxiomLayer = (config: AxiomConfig): Layer.Layer<never> => {
	const domain = config.domain ?? "api.axiom.co";
	const baseUrl = `https://${domain}`;

	const resource = {
		serviceName: config.serviceName,
		serviceVersion: config.serviceVersion,
		attributes: {
			"deployment.environment": config.environment ?? "production",
		},
	};

	const tracesLayer = OtlpTracer.layer({
		url: `${baseUrl}/v1/traces`,
		resource,
		headers: {
			Authorization: `Bearer ${config.apiToken}`,
			"X-Axiom-Dataset": config.tracesDataset,
		},
		exportInterval: config.tracesExportInterval ?? Duration.seconds(5),
		maxBatchSize: 1000,
		shutdownTimeout: Duration.seconds(5),
	});

	const logsLayer = OtlpLogger.layer({
		url: `${baseUrl}/v1/logs`,
		resource,
		headers: {
			Authorization: `Bearer ${config.apiToken}`,
			"X-Axiom-Dataset": config.logsDataset,
		},
		exportInterval: config.logsExportInterval ?? Duration.seconds(1),
		maxBatchSize: 1000,
		shutdownTimeout: Duration.seconds(3),
	});

	const metricsLayer = OtlpMetrics.layer({
		url: `${baseUrl}/v1/metrics`,
		resource,
		headers: {
			Authorization: `Bearer ${config.apiToken}`,
			"X-Axiom-Metrics-Dataset": config.metricsDataset,
		},
		exportInterval: config.metricsExportInterval ?? Duration.seconds(10),
		shutdownTimeout: Duration.seconds(3),
	});

	const httpClientLayer = Layer.provideMerge(
		AxiomMetricsHttpClientLayer,
		FetchHttpClient.layer,
	);

	return Layer.mergeAll(tracesLayer, logsLayer, metricsLayer).pipe(
		Layer.provide(httpClientLayer),
	);
};
