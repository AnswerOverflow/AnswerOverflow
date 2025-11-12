import { DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/otel";
import { Console, Effect, Layer, Logger, LogLevel } from "effect";
import { Discord, DiscordLayer } from "./src/core/discord-service";
import { ChannelParityLayer } from "./src/parity/channel-parity";
import { InteractionHandlersLayer } from "./src/parity/interaction-handlers";
import { MessageParityLayer } from "./src/parity/message-parity";
import { ServerParityLayer } from "./src/parity/server-parity";

const program = Effect.gen(function* () {
	const discord = yield* Discord;

	// Login to Discord and wait for ready
	yield* discord.client.login();

	// Get and log guild count
	const guilds = yield* discord.getGuilds();
	yield* Console.log(`Bot is in ${guilds.length} guilds`);

	// Keep the bot running
	return yield* Effect.never;
});

// Run the program with the DiscordClientLayer and OpenTelemetry tracing
const OtelLayer = createOtelLayer("discord-bot");
// Set minimum log level to Info to filter out Debug logs
const LoggerLayer = Logger.minimumLogLevel(LogLevel.Info);

// Base layers that provide services
const BaseLayer = Layer.mergeAll(
	DiscordLayer,
	DatabaseLayer,
	OtelLayer,
	LoggerLayer,
);

// Parity layers that require Discord and Database
const ParityLayers = Layer.mergeAll(
	ServerParityLayer,
	ChannelParityLayer,
	MessageParityLayer,
	InteractionHandlersLayer,
);

// Provide BaseLayer to ParityLayers, then merge everything
const AppLayer = Layer.mergeAll(
	BaseLayer,
	ParityLayers.pipe(Layer.provide(BaseLayer)),
);

Effect.runPromise(Effect.scoped(program.pipe(Effect.provide(AppLayer)))).catch(
	(error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	},
);
