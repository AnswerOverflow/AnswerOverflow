import { Database } from "@packages/database/database";
import type { Message } from "discord.js";
import { ChannelType } from "discord.js";
import { Console, Effect, Layer, Metric } from "effect";
import { Discord } from "../core/discord-service";
import { eventsProcessed } from "../metrics";
import { ConsentSource, trackUserGrantConsent } from "../utils/analytics";
import { grantPublicDisplayConsent, isAccountIgnored } from "../utils/consent";
import {
	catchAllSilentWithReport,
	catchAllWithReport,
} from "../utils/error-reporting";
import { isHumanMessage } from "../utils/message-utils";

export const handleForumGuidelinesConsent = Effect.fn(
	"event.forum_guidelines_consent",
)(function* (message: Message) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": message.guildId ?? "unknown",
		"discord.channel_id": message.channelId,
		"discord.user_id": message.author.id,
	});
	yield* Metric.increment(eventsProcessed);

	const database = yield* Database;

	if (message.channel.isDMBased() || message.channel.isVoiceBased()) {
		return;
	}

	if (!isHumanMessage(message)) {
		return;
	}

	if (!message.channel.isThread()) {
		return;
	}

	const thread = message.channel;
	if (thread.parent?.type !== ChannelType.GuildForum) {
		return;
	}

	if (!message.guildId) {
		return;
	}

	const serverLiveData = yield* database.private.servers.getServerByDiscordId({
		discordId: BigInt(message.guildId),
	});
	const server = serverLiveData;

	if (!server) {
		return;
	}

	const parentChannelLiveData =
		yield* database.private.channels.findChannelByDiscordId({
			discordId: BigInt(thread.parent.id),
		});
	const parentChannel = parentChannelLiveData;

	if (!parentChannel) {
		return;
	}

	if (!parentChannel.flags?.forumGuidelinesConsentEnabled) {
		return;
	}

	const ignored = yield* isAccountIgnored(BigInt(message.author.id));
	if (ignored) {
		return;
	}

	const granted = yield* grantPublicDisplayConsent(
		BigInt(message.author.id),
		server.discordId,
	);

	if (granted) {
		const member = message.member;
		if (member) {
			yield* catchAllSilentWithReport(
				trackUserGrantConsent(member, ConsentSource.ForumPostGuidelines),
			);
		}
		yield* Console.log(
			`Granted forum guidelines consent for user ${message.author.id} in server ${server.discordId}`,
		);
	}
});

export const ForumGuidelinesConsentHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("messageCreate", (message) =>
			handleForumGuidelinesConsent(message).pipe(
				catchAllWithReport((error) =>
					Console.error(
						`Error processing forum guidelines consent for message ${message.id}:`,
						error,
					),
				),
			),
		);
	}),
);
