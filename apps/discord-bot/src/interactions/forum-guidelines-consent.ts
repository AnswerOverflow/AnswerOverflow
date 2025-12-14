import { Database } from "@packages/database/database";
import type { Message } from "discord.js";
import { ChannelType } from "discord.js";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import { ConsentSource, trackUserGrantConsent } from "../utils/analytics";
import { grantPublicDisplayConsent, isAccountIgnored } from "../utils/consent";
import { isHumanMessage } from "../utils/message-utils";

export function handleForumGuidelinesConsent(message: Message) {
	return Effect.gen(function* () {
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

		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: BigInt(message.guildId),
			},
		);
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
				yield* trackUserGrantConsent(
					member,
					ConsentSource.ForumPostGuidelines,
				).pipe(Effect.catchAll(() => Effect.void));
			}
			yield* Console.log(
				`Granted forum guidelines consent for user ${message.author.id} in server ${server.discordId}`,
			);
		}
	}).pipe(
		Effect.catchAll((error) =>
			Console.error(
				`Error processing forum guidelines consent for message ${message.id}:`,
				error,
			),
		),
	);
}

export const ForumGuidelinesConsentHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("messageCreate", (message) =>
			handleForumGuidelinesConsent(message),
		);
	}),
);
