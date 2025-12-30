import { Console, Effect, Layer } from "effect";
import { BugReportCommandHandlerLayer } from "./commands/bug-report";
import { ChannelSettingsCommandHandlerLayer } from "./commands/channel-settings";
import { ConvertToGitHubIssueReacordLayer } from "./commands/convert-to-github-issue-reacord";
import { DebugCommandHandlerLayer } from "./commands/debug";
import { FeedbackCommandHandlerLayer } from "./commands/feedback";
import { IndexCommandHandlerLayer } from "./commands/index-command";
import { LeaderboardCommandHandlerLayer } from "./commands/leaderboard";
import { LeaveCommandHandlerLayer } from "./commands/leave-command";
import { ManageAccountCommandHandlerLayer } from "./commands/manage-account";
import { MarkSolutionCommandHandlerLayer } from "./commands/mark-solution";
import { ReacordStressTestLayer } from "./commands/reacord-stress-test/index";
import { SitemapCommandHandlerLayer } from "./commands/sitemap-command";
import { Discord } from "./core/discord-service";
import { ConsentButtonHandlerLayer } from "./interactions/consent-button";
import { DismissButtonHandlerLayer } from "./interactions/dismiss-button";
import { DMReplyHandlerLayer } from "./interactions/dm-reply-button";
import { ForumGuidelinesConsentHandlerLayer } from "./interactions/forum-guidelines-consent";
import { QuickActionCommandHandlerLayer } from "./interactions/quick-action";
import { ReadTheRulesConsentHandlerLayer } from "./interactions/read-the-rules-consent";
import { SimilarThreadsButtonHandlerLayer } from "./interactions/similar-threads-button";
import { AutoThreadHandlerLayer } from "./services/auto-thread";
import { BotIdentitySyncHandlerLayer } from "./services/bot-identity-sync";
import { DMForwardingHandlerLayer } from "./services/dm-forwarding";
import { IndexingHandlerLayer } from "./services/indexing";
import { SendMarkSolutionInstructionsHandlerLayer } from "./services/send-mark-solution-instructions-handler";
import { SitemapHandlerLayer } from "./services/sitemap";
import { StatusUpdateHandlerLayer } from "./services/status-update";
import { BotPermissionsSyncLayer } from "./sync/bot-permissions";
import { ChannelParityLayer } from "./sync/channel";
import { MessageParityLayer } from "./sync/message";
import { ServerParityLayer } from "./sync/server";
import { UserParityLayer } from "./sync/user";

export const BotLayers = Layer.mergeAll(
	ServerParityLayer,
	ChannelParityLayer,
	MessageParityLayer,
	UserParityLayer,
	BotPermissionsSyncLayer,
	AutoThreadHandlerLayer,
	ConsentButtonHandlerLayer,
	DismissButtonHandlerLayer,
	DMReplyHandlerLayer,
	SimilarThreadsButtonHandlerLayer,
	ForumGuidelinesConsentHandlerLayer,
	ReadTheRulesConsentHandlerLayer,
	LeaderboardCommandHandlerLayer,
	ManageAccountCommandHandlerLayer,
	MarkSolutionCommandHandlerLayer,
	QuickActionCommandHandlerLayer,
	ChannelSettingsCommandHandlerLayer,
	DebugCommandHandlerLayer,
	IndexCommandHandlerLayer,
	LeaveCommandHandlerLayer,
	SendMarkSolutionInstructionsHandlerLayer,
	StatusUpdateHandlerLayer,
	IndexingHandlerLayer,
	DMForwardingHandlerLayer,
	FeedbackCommandHandlerLayer,
	BugReportCommandHandlerLayer,
	BotIdentitySyncHandlerLayer,
	ConvertToGitHubIssueReacordLayer,
	ReacordStressTestLayer,
	SitemapHandlerLayer,
	SitemapCommandHandlerLayer,
);

export const program = Effect.gen(function* () {
	const discord = yield* Discord;

	yield* discord.client.login();

	const guilds = yield* discord.getGuilds();
	yield* Console.log(`Bot is in ${guilds.length} guilds`);

	return yield* Effect.never;
});
