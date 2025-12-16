import "./src/instrument";

import { PostHogCaptureClientLayer } from "@packages/database/analytics/server";
import { DatabaseLayer } from "@packages/database/database";
import { ConvexStorageLayer } from "@packages/database/storage";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { captureEffectCause, flush } from "@packages/observability/sentry";
import { Cause, Effect, Layer, Logger, LogLevel } from "effect";
import { BotLayers, program } from "./src/bot";
import { DiscordLayer } from "./src/core/discord-service";

const OtelLayer = createOtelLayer("discord-bot");
const LoggerLayer = Logger.minimumLogLevel(LogLevel.Info);

const BaseLayer = Layer.mergeAll(
	DiscordLayer,
	DatabaseLayer,
	ConvexStorageLayer.pipe(Layer.provide(DatabaseLayer)),
	PostHogCaptureClientLayer,
	OtelLayer,
	LoggerLayer,
);

export const AppLayer = Layer.mergeAll(
	BaseLayer,
	BotLayers.pipe(Layer.provide(BaseLayer)),
);

const runProgram = program.pipe(
	Effect.provide(AppLayer),
	Effect.tapErrorCause((cause) =>
		Effect.sync(() => {
			captureEffectCause(cause, { tags: { fatal: "true" } });
			console.error("Fatal error:", Cause.squash(cause));
		}),
	),
	Effect.ensuring(Effect.promise(() => flush(2000))),
);

Effect.runFork(runProgram);

process.on("SIGTERM", async () => {
	await flush(2000);
	process.exit(0);
});

process.on("SIGINT", async () => {
	await flush(2000);
	process.exit(0);
});
