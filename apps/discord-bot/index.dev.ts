import { NodeRuntime } from "@effect/platform-node";
import { PostHogCaptureClientLayer } from "@packages/database/analytics/server";
import { DatabaseHttpLayer } from "@packages/database/database";
import { ConvexStorageLayer } from "@packages/database/storage";
import { createAxiomLayer } from "@packages/observability/axiom";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { Effect, Layer, Logger, LogLevel } from "effect";

import { BotLayers, program } from "./src/bot";
import { DiscordLayer } from "./src/core/discord-service";

const LocalOtelLayer = createOtelLayer(
	"discord-bot",
	process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces",
);

const AxiomLayer = process.env.AXIOM_API_TOKEN
	? createAxiomLayer({
			apiToken: process.env.AXIOM_API_TOKEN,
			tracesDataset:
				process.env.AXIOM_TRACES_DATASET ?? "discord-bot-traces-dev",
			logsDataset: process.env.AXIOM_LOGS_DATASET ?? "discord-bot-logs-dev",
			metricsDataset:
				process.env.AXIOM_METRICS_DATASET ?? "discord-bot-metrics-dev",
			domain: process.env.AXIOM_DOMAIN,
			serviceName: "discord-bot",
			serviceVersion: process.env.SENTRY_RELEASE,
			environment: "development",
		})
	: Layer.empty;

const LoggerLayer = Logger.minimumLogLevel(LogLevel.Debug);

const BaseLayer = Layer.mergeAll(
	DiscordLayer,
	ConvexStorageLayer,
	PostHogCaptureClientLayer,
	LocalOtelLayer,
	AxiomLayer,
	LoggerLayer,
).pipe(Layer.provideMerge(DatabaseHttpLayer));

export const AppLayer = Layer.mergeAll(
	BaseLayer,
	BotLayers.pipe(Layer.provide(BaseLayer)),
);

NodeRuntime.runMain(program.pipe(Effect.provide(AppLayer)));
