import { DatabaseHttpLayer } from "@packages/database/database";
import { createAxiomLayer } from "@packages/observability/axiom";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { createSentryEffectLayer } from "@packages/observability/sentry-effect";
import { Atom } from "@packages/reacord";
import { Effect, Layer, Logger, LogLevel } from "effect";

const SentryLayer = process.env.SENTRY_DSN
	? createSentryEffectLayer({
			dsn: process.env.SENTRY_DSN,
			serviceName: "discord-bot",
			environment: process.env.NODE_ENV ?? "production",
			release: process.env.SENTRY_RELEASE,
			tracesSampleRate: 0.5,
		})
	: Layer.empty;

const LocalOtelLayer =
	process.env.NODE_ENV === "development"
		? createOtelLayer(
				"discord-bot",
				process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
					"http://localhost:4318/v1/traces",
			)
		: Layer.empty;

const AxiomLayer = process.env.AXIOM_API_TOKEN
	? createAxiomLayer({
			apiToken: process.env.AXIOM_API_TOKEN,
			tracesDataset: process.env.AXIOM_TRACES_DATASET ?? "discord-bot-traces",
			logsDataset: process.env.AXIOM_LOGS_DATASET ?? "discord-bot-logs",
			metricsDataset:
				process.env.AXIOM_METRICS_DATASET ?? "discord-bot-metrics",
			domain: process.env.AXIOM_DOMAIN,
			serviceName: "discord-bot",
			serviceVersion: process.env.SENTRY_RELEASE,
			environment: process.env.NODE_ENV ?? "production",
		})
	: Layer.empty;

const LoggerLayer =
	process.env.NODE_ENV === "development"
		? Logger.minimumLogLevel(LogLevel.Debug)
		: Logger.minimumLogLevel(LogLevel.Info);

const ObservabilityLayer = Layer.mergeAll(
	SentryLayer,
	LocalOtelLayer,
	AxiomLayer,
	LoggerLayer,
);

export const PlatformLayer = Layer.mergeAll(
	ObservabilityLayer,
	DatabaseHttpLayer,
);

export const sharedMemoMap = Effect.runSync(Layer.makeMemoMap);

export const atomRuntime = Atom.context({ memoMap: sharedMemoMap })(
	PlatformLayer,
);
