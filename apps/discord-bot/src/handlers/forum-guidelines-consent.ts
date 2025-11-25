import { Database } from "@packages/database/database";
import type { Message } from "discord.js";
import { ChannelType } from "discord.js";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import { toBigIntIdRequired } from "../utils/conversions";
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
				discordId: toBigIntIdRequired(message.guildId),
			},
		);
		const server = serverLiveData;

		if (!server) {
			return;
		}

		const parentChannelLiveData =
			yield* database.private.channels.findChannelByDiscordId({
				discordId: toBigIntIdRequired(thread.parent.id),
			});
		const parentChannel = parentChannelLiveData;

		if (!parentChannel) {
			return;
		}

		if (!parentChannel.flags?.forumGuidelinesConsentEnabled) {
			return;
		}

		const ignoredAccount =
			yield* database.private.ignored_discord_accounts.findIgnoredDiscordAccountById(
				{
					id: toBigIntIdRequired(message.author.id),
				},
			);

		if (ignoredAccount !== null) {
			return;
		}

		const userServerSettingsLiveData =
			yield* database.private.user_server_settings.findUserServerSettingsById({
				userId: toBigIntIdRequired(message.author.id),
				serverId: server.discordId,
			});
		const userServerSettings = userServerSettingsLiveData;

		if (userServerSettings?.canPubliclyDisplayMessages === true) {
			return;
		}

		if (userServerSettings?.messageIndexingDisabled === true) {
			return;
		}

		const existingSettings = userServerSettings
			? {
					userId: userServerSettings.userId,
					serverId: userServerSettings.serverId,
					permissions: userServerSettings.permissions,
					canPubliclyDisplayMessages: true,
					messageIndexingDisabled: userServerSettings.messageIndexingDisabled,
					apiKey: userServerSettings.apiKey,
					apiCallsUsed: userServerSettings.apiCallsUsed,
					botAddedTimestamp: userServerSettings.botAddedTimestamp,
				}
			: {
					userId: toBigIntIdRequired(message.author.id),
					serverId: server.discordId,
					permissions: 0,
					canPubliclyDisplayMessages: true,
					messageIndexingDisabled: false,
					apiCallsUsed: 0,
				};

		yield* database.private.user_server_settings.upsertUserServerSettings({
			settings: existingSettings,
		});

		yield* Console.log(
			`Granted forum guidelines consent for user ${message.author.id} in server ${server.discordId}`,
		);
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
