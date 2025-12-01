import { Console, Effect, Layer } from "effect";
import { Discord } from "./core/discord-service";
import { AutoThreadHandlerLayer } from "./handlers/auto-thread";
import { BotPermissionsSyncLayer } from "./handlers/bot-permissions-sync";
import { ChannelParityLayer } from "./handlers/channel-parity";
import { ChannelSettingsCommandHandlerLayer } from "./handlers/channel-settings-command";
import { DebugCommandHandlerLayer } from "./handlers/debug-command";
import { DismissButtonHandlerLayer } from "./handlers/dismiss-button";
import { ForumGuidelinesConsentHandlerLayer } from "./handlers/forum-guidelines-consent";
import { IndexingHandlerLayer } from "./handlers/indexing";
import { LeaderboardCommandHandlerLayer } from "./handlers/leaderboard-command";
import { ManageAccountCommandHandlerLayer } from "./handlers/manage-account-command";
import { MarkSolutionCommandHandlerLayer } from "./handlers/mark-solution-command";
import { MessageParityLayer } from "./handlers/message-parity";
import { QuickActionCommandHandlerLayer } from "./handlers/quick-action";
import { ReadTheRulesConsentHandlerLayer } from "./handlers/read-the-rules-consent";
import { SendMarkSolutionInstructionsHandlerLayer } from "./handlers/send-mark-solution-instructions-handler";
import { ServerParityLayer } from "./handlers/server-parity";
import { StatusUpdateHandlerLayer } from "./handlers/status-update";
import { UserParityLayer } from "./handlers/user-parity";

export const BotLayers = Layer.mergeAll(
	ServerParityLayer,
	ChannelParityLayer,
	MessageParityLayer,
	UserParityLayer,
	BotPermissionsSyncLayer,
	AutoThreadHandlerLayer,
	DismissButtonHandlerLayer,
	ForumGuidelinesConsentHandlerLayer,
	ReadTheRulesConsentHandlerLayer,
	LeaderboardCommandHandlerLayer,
	ManageAccountCommandHandlerLayer,
	MarkSolutionCommandHandlerLayer,
	QuickActionCommandHandlerLayer,
	ChannelSettingsCommandHandlerLayer,
	DebugCommandHandlerLayer,
	SendMarkSolutionInstructionsHandlerLayer,
	StatusUpdateHandlerLayer,
	IndexingHandlerLayer,
);

export const program = Effect.gen(function* () {
	const discord = yield* Discord;

	yield* discord.client.login();

	const guilds = yield* discord.getGuilds();
	yield* Console.log(`Bot is in ${guilds.length} guilds`);

	return yield* Effect.never;
});
