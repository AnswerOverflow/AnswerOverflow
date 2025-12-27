import { PostHogCaptureClientLayer } from "@packages/database/analytics/server";
import { DatabaseHttpLayer, type Database } from "@packages/database/database";
import type { Storage } from "@packages/database/storage";
import { Atom } from "@packages/reacord";
import { createAxiomLayer } from "@packages/observability/axiom";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { createSentryEffectLayer } from "@packages/observability/sentry-effect";
import { Effect, Layer, Logger, LogLevel, ManagedRuntime } from "effect";
import { BotLayers } from "../bot";
import { DiscordClientLayer } from "./discord-client-service";
import { DiscordLayerInternal } from "./discord-service";
import { createReacordLayer } from "./reacord-layer";

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

export const ObservabilityLayer = Layer.mergeAll(
	SentryLayer,
	LocalOtelLayer,
	AxiomLayer,
	LoggerLayer,
);

export const BaseRuntimeLayer = Layer.mergeAll(
	DatabaseHttpLayer,
	ObservabilityLayer,
);

export const runtime = ManagedRuntime.make(BaseRuntimeLayer);

export const atomRuntime = Atom.context({ memoMap: runtime.memoMap })(
	BaseRuntimeLayer,
);

const DiscordWithReacord = Layer.mergeAll(
	DiscordLayerInternal,
	createReacordLayer(runtime),
).pipe(Layer.provide(DiscordClientLayer), Layer.provide(ObservabilityLayer));

export const createAppLayer = (
	storageLayer: Layer.Layer<Storage, never, Database>,
) => {
	const BaseLayer = Layer.mergeAll(
		DiscordWithReacord,
		storageLayer,
		PostHogCaptureClientLayer,
		ObservabilityLayer,
	).pipe(Layer.provideMerge(DatabaseHttpLayer));

	return Layer.mergeAll(BaseLayer, BotLayers.pipe(Layer.provide(BaseLayer)));
};

export const runMain = <A, E, R, EL>(
	effect: Effect.Effect<A, E, R>,
	appLayer: Layer.Layer<R, EL, never>,
) => {
	const controller = new AbortController();

	process.on("SIGINT", () => controller.abort());
	process.on("SIGTERM", () => controller.abort());

	return runtime
		.runPromise(effect.pipe(Effect.provide(appLayer)), {
			signal: controller.signal,
		})
		.catch((error) => {
			console.error("Fatal error:", error);
			process.exit(1);
		});
};
