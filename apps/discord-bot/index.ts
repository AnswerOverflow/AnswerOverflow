import { PostHogCaptureClientLayer } from "@packages/database/analytics/server";
import { DatabaseLayer } from "@packages/database/database";
import { S3StorageLayer } from "@packages/database/storage";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { Effect, Layer, Logger, LogLevel } from "effect";
import { BotLayers, program } from "./src/bot";
import { DiscordLayer } from "./src/core/discord-service";

const OtelLayer = createOtelLayer("discord-bot");
const LoggerLayer = Logger.minimumLogLevel(LogLevel.Info);

const BaseLayer = Layer.mergeAll(
	DiscordLayer,
	DatabaseLayer,
	S3StorageLayer.pipe(Layer.provide(DatabaseLayer)),
	PostHogCaptureClientLayer,
	OtelLayer,
	LoggerLayer,
);

export const AppLayer = Layer.mergeAll(
	BaseLayer,
	BotLayers.pipe(Layer.provide(BaseLayer)),
);

Effect.runPromise(program.pipe(Effect.provide(AppLayer))).catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
