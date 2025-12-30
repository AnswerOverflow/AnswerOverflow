import { DatabaseHttpLayer } from "@packages/database/database";
import { createAxiomLayer } from "@packages/observability/axiom";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { ConfigProvider, Layer, ManagedRuntime } from "effect";

const tracesEndpoint = (
	process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318"
).replace(/\/$/, "");

const LocalOtelLayer =
	process.env.NODE_ENV === "development"
		? createOtelLayer(
				"main-site",
				tracesEndpoint.endsWith("/v1/traces")
					? tracesEndpoint
					: `${tracesEndpoint}/v1/traces`,
			)
		: Layer.empty;

const AxiomLayer = process.env.AXIOM_API_TOKEN
	? createAxiomLayer({
			apiToken: process.env.AXIOM_API_TOKEN,
			tracesDataset: process.env.AXIOM_TRACES_DATASET ?? "main-site-traces",
			logsDataset: process.env.AXIOM_LOGS_DATASET ?? "main-site-logs",
			metricsDataset: process.env.AXIOM_METRICS_DATASET ?? "main-site-metrics",
			domain: process.env.AXIOM_DOMAIN,
			serviceName: "main-site",
			serviceVersion: process.env.SENTRY_RELEASE,
			environment: process.env.NODE_ENV ?? "production",
		})
	: Layer.empty;

const ObservabilityLayer = Layer.mergeAll(LocalOtelLayer, AxiomLayer);
const ConfigProviderLayer = Layer.setConfigProvider(ConfigProvider.fromEnv());

export const runtime = ManagedRuntime.make(
	Layer.mergeAll(DatabaseHttpLayer, ObservabilityLayer, ConfigProviderLayer),
);
