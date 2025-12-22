import { NodeRuntime } from "@effect/platform-node";
import { PostHogCaptureClientLayer } from "@packages/database/analytics/server";
import { DatabaseHttpLayer } from "@packages/database/database";
import { S3StorageLayer } from "@packages/database/storage";
import { createObservabilityLayer } from "@packages/observability/observability";
import { Effect, Layer, Logger, LogLevel } from "effect";

import { BotLayers, program } from "./src/bot";
import { DiscordLayer } from "./src/core/discord-service";

const ObservabilityLayer = createObservabilityLayer({
	sentry: {
		dsn: process.env.SENTRY_DSN,
		serviceName: "discord-bot",
		environment: process.env.NODE_ENV ?? "production",
		release: process.env.SENTRY_RELEASE,
		tracesSampleRate: 0.5,
	},
	axiom: process.env.AXIOM_API_TOKEN
		? {
				apiToken: process.env.AXIOM_API_TOKEN,
				tracesDataset: process.env.AXIOM_TRACES_DATASET ?? "discord-bot-traces",
				logsDataset: process.env.AXIOM_LOGS_DATASET ?? "discord-bot-logs",
				metricsDataset:
					process.env.AXIOM_METRICS_DATASET ?? "discord-bot-metrics",
				domain: process.env.AXIOM_DOMAIN,
				serviceName: "discord-bot",
				serviceVersion: process.env.SENTRY_RELEASE,
				environment: process.env.NODE_ENV ?? "production",
			}
		: undefined,
});

const LoggerLayer = Logger.minimumLogLevel(LogLevel.Info);

const BaseLayer = Layer.mergeAll(
	DiscordLayer,
	S3StorageLayer,
	PostHogCaptureClientLayer,
	ObservabilityLayer,
	LoggerLayer,
).pipe(Layer.provideMerge(DatabaseHttpLayer));

export const AppLayer = Layer.mergeAll(
	BaseLayer,
	BotLayers.pipe(Layer.provide(BaseLayer)),
);

NodeRuntime.runMain(program.pipe(Effect.provide(AppLayer)));
