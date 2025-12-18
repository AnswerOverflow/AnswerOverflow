import { NodeRuntime } from "@effect/platform-node";
import { PostHogCaptureClientLayer } from "@packages/database/analytics/server";
import { DatabaseHttpLayer } from "@packages/database/database";
import { ConvexStorageLayer } from "@packages/database/storage";
import { createSentryEffectLayer } from "@packages/observability/sentry-effect";
import { Effect, Layer, Logger, LogLevel } from "effect";
import { BotLayers, program } from "./src/bot";
import { DiscordLayer } from "./src/core/discord-service";

const SentryLayer = createSentryEffectLayer({
	dsn: process.env.SENTRY_DSN,
	serviceName: "discord-bot",
	environment: process.env.NODE_ENV ?? "development",
	release: process.env.SENTRY_RELEASE,
	tracesSampleRate: 1.0,
});

const LoggerLayer = Logger.minimumLogLevel(LogLevel.Debug);

const BaseLayer = Layer.mergeAll(
	DiscordLayer,
	ConvexStorageLayer,
	PostHogCaptureClientLayer,
	SentryLayer,
	LoggerLayer,
).pipe(Layer.provideMerge(DatabaseHttpLayer));

export const AppLayer = Layer.mergeAll(
	BaseLayer,
	BotLayers.pipe(Layer.provide(BaseLayer)),
);

NodeRuntime.runMain(program.pipe(Effect.provide(AppLayer)));
