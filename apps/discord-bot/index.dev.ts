import { NodeRuntime } from "@effect/platform-node";
import { PostHogCaptureClientLayer } from "@packages/database/analytics/server";
import { DatabaseHttpLayer } from "@packages/database/database";
import { ConvexStorageLayer } from "@packages/database/storage";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { Effect, Layer, Logger, LogLevel } from "effect";

import { BotLayers, program } from "./src/bot";
import { DiscordLayer } from "./src/core/discord-service";

const LocalOtelLayer = createOtelLayer(
	"discord-bot",
	process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces",
);

const LoggerLayer = Logger.minimumLogLevel(LogLevel.Debug);

const BaseLayer = Layer.mergeAll(
	DiscordLayer,
	ConvexStorageLayer,
	PostHogCaptureClientLayer,
	LocalOtelLayer,
	LoggerLayer,
).pipe(Layer.provideMerge(DatabaseHttpLayer));

export const AppLayer = Layer.mergeAll(
	BaseLayer,
	BotLayers.pipe(Layer.provide(BaseLayer)),
);

NodeRuntime.runMain(program.pipe(Effect.provide(AppLayer)));
