import { captureMessage } from "@packages/observability/sentry";
import { Console, Effect, Layer } from "effect";
import { BugReportCommandHandlerLayer } from "./commands/bug-report";
import { ChannelSettingsCommandHandlerLayer } from "./commands/channel-settings";
import { ConvertToGitHubIssueReacordLayer } from "./commands/convert-to-github-issue-reacord";
import { DebugCommandHandlerLayer } from "./commands/debug";
import { ExportCommandHandlerLayer } from "./commands/export";
import { FeedbackCommandHandlerLayer } from "./commands/feedback";
import { IndexCommandHandlerLayer } from "./commands/index-command";
import { LeaderboardCommandHandlerLayer } from "./commands/leaderboard";
import { LeaveCommandHandlerLayer } from "./commands/leave-command";
import { ManageAccountReacordLayer } from "./commands/manage-account-reacord";
import { MarkSolutionCommandHandlerLayer } from "./commands/mark-solution";
import { ReacordStressTestLayer } from "./commands/reacord-stress-test/index";
import { SitemapCommandHandlerLayer } from "./commands/sitemap-command";
import { V2ComponentsDemoCommandHandlerLayer } from "./commands/v2-components-demo";
import { DiscordClient } from "./core/discord-client-service";
import { Discord } from "./core/discord-service";
import {
	acquireGatewayLease,
	ConvexLeaseStore,
	maintainGatewayLease,
	newHolderId,
	releaseGatewayLease,
} from "./core/gateway-lease";
import { ConsentButtonHandlerLayer } from "./interactions/consent-button";
import { DismissButtonHandlerLayer } from "./interactions/dismiss-button";
import { DMReplyHandlerLayer } from "./interactions/dm-reply-button";
import { ForumGuidelinesConsentHandlerLayer } from "./interactions/forum-guidelines-consent";
import { QuickActionCommandHandlerLayer } from "./interactions/quick-action";
import { ReadTheRulesConsentHandlerLayer } from "./interactions/read-the-rules-consent";
import { SimilarThreadsButtonHandlerLayer } from "./interactions/similar-threads-button";
import { AutoThreadHandlerLayer } from "./services/auto-thread";
import { BotIdentitySyncHandlerLayer } from "./services/bot-identity-sync";
import { GatewayHealthHandlerLayer } from "./services/gateway-health";
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
	ManageAccountReacordLayer,
	MarkSolutionCommandHandlerLayer,
	QuickActionCommandHandlerLayer,
	ChannelSettingsCommandHandlerLayer,
	DebugCommandHandlerLayer,
	IndexCommandHandlerLayer,
	LeaveCommandHandlerLayer,
	SendMarkSolutionInstructionsHandlerLayer,
	StatusUpdateHandlerLayer,
	IndexingHandlerLayer,
	FeedbackCommandHandlerLayer,
	BugReportCommandHandlerLayer,
	BotIdentitySyncHandlerLayer,
	ConvertToGitHubIssueReacordLayer,
	ReacordStressTestLayer,
	V2ComponentsDemoCommandHandlerLayer,
	SitemapHandlerLayer,
	SitemapCommandHandlerLayer,
	GatewayHealthHandlerLayer,
	ExportCommandHandlerLayer,
);

export const program = Effect.gen(function* () {
	const discord = yield* Discord;
	const client = yield* DiscordClient;
	const leaseStore = yield* ConvexLeaseStore;

	const closeGateway = Effect.promise(() => client.destroy()).pipe(
		Effect.tap(() => Console.log("Discord gateway closed")),
	);

	const held = yield* acquireGatewayLease(leaseStore, newHolderId());

	// Finalizers run in reverse: leave the gateway first so this process stops
	// receiving events, then hand the lease to the replacement.
	yield* Effect.addFinalizer(() => releaseGatewayLease(leaseStore, held.lease));
	yield* Effect.addFinalizer(() => closeGateway);

	yield* discord.client.login();

	yield* Effect.forkScoped(
		maintainGatewayLease(leaseStore, held).pipe(
			Effect.flatMap((loss) =>
				Effect.gen(function* () {
					const message = `Gateway lease ${loss}; disconnecting so only one bot acts.`;
					console.error(`[GatewayLease] ${message}`);
					captureMessage(message, "error");
					yield* closeGateway;
					process.exit(1);
				}),
			),
		),
	);

	const guilds = yield* discord.getGuilds();
	yield* Console.log(`Bot is in ${guilds.length} guilds`);

	return yield* Effect.never;
}).pipe(Effect.scoped);
