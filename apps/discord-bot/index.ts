import { DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { Console, Effect, Layer, Logger, LogLevel } from "effect";
import { Discord, DiscordLayer } from "./src/core/discord-service";
import { AutoThreadHandlerLayer } from "./src/handlers/auto-thread";
import { ChannelParityLayer } from "./src/handlers/channel-parity";
import { ChannelSettingsCommandHandlerLayer } from "./src/handlers/channel-settings-command";
import { DismissButtonHandlerLayer } from "./src/handlers/dismiss-button";
import { LeaderboardCommandHandlerLayer } from "./src/handlers/leaderboard-command";
import { ManageAccountCommandHandlerLayer } from "./src/handlers/manage-account-command";
import { MarkSolutionCommandHandlerLayer } from "./src/handlers/mark-solution-command";
import { MessageParityLayer } from "./src/handlers/message-parity";
import { SendMarkSolutionInstructionsHandlerLayer } from "./src/handlers/send-mark-solution-instructions-handler";
import { ServerParityLayer } from "./src/handlers/server-parity";

const program = Effect.gen(function* () {
	const discord = yield* Discord;

	yield* discord.client.login();

	const guilds = yield* discord.getGuilds();
	yield* Console.log(`Bot is in ${guilds.length} guilds`);

	return yield* Effect.never;
});

const OtelLayer = createOtelLayer("discord-bot");
const LoggerLayer = Logger.minimumLogLevel(LogLevel.Info);

const BaseLayer = Layer.mergeAll(
	DiscordLayer,
	DatabaseLayer,
	OtelLayer,
	LoggerLayer,
);

const ParityLayers = Layer.mergeAll(
	ServerParityLayer,
	ChannelParityLayer,
	MessageParityLayer,
	AutoThreadHandlerLayer,
	DismissButtonHandlerLayer,
	LeaderboardCommandHandlerLayer,
	ManageAccountCommandHandlerLayer,
	MarkSolutionCommandHandlerLayer,
	ChannelSettingsCommandHandlerLayer,
	SendMarkSolutionInstructionsHandlerLayer,
);

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
