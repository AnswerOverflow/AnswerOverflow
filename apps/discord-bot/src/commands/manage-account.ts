import { PostHogCaptureClientLayer } from "@packages/database/analytics/server/capture-client";
import { Database } from "@packages/database/database";
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	type MessageActionRowComponentBuilder,
	MessageFlags,
} from "discord.js";
import { Effect, Layer, Metric } from "effect";
import { Discord } from "../core/discord-service";
import { commandExecuted } from "../metrics";
import { ConsentSource, trackUserGrantConsent } from "../utils/analytics";
import { catchAllSilentWithReport } from "../utils/error-reporting";

export const menuButtonIds = {
	consentButton: "consent-button",
	revokeConsentButton: "revoke-consent-button",
	enableMessageIndexingButton: "enable-message-indexing-button",
	disableMessageIndexingButton: "disable-message-indexing-button",
	ignoreGloballyButton: "ignore-globally-button",
	unignoreGloballyButton: "unignore-globally-button",
} as const;

type UserServerSettingsWithFlags = {
	userId: string;
	serverId: string;
	permissions: number;
	canPubliclyDisplayMessages: boolean;
	messageIndexingDisabled: boolean;
	apiKey?: string;
	apiCallsUsed: number;
	flags: {
		canPubliclyDisplayMessages: boolean;
		messageIndexingDisabled: boolean;
	};
};

type ManageAccountState = {
	userServerSettings: UserServerSettingsWithFlags;
	isIgnoredAccount: boolean;
};

function getDefaultUserServerSettingsWithFlags({
	userId,
	serverId,
}: {
	userId: string;
	serverId: string;
}): UserServerSettingsWithFlags {
	return {
		userId,
		serverId,
		permissions: 0,
		canPubliclyDisplayMessages: false,
		messageIndexingDisabled: false,
		apiCallsUsed: 0,
		flags: {
			canPubliclyDisplayMessages: false,
			messageIndexingDisabled: false,
		},
	};
}

function generateManageAccountEmbed(state: ManageAccountState): EmbedBuilder {
	const embed = new EmbedBuilder()
		.setTitle("Manage your account settings")
		.setDescription(
			state.isIgnoredAccount
				? "Your account is currently being ignored globally. You can stop ignoring it by clicking the button below."
				: "Here, you can manage how Answer Overflow interacts with your account.",
		);
	return embed;
}

function generateManageAccountActionRow(
	state: ManageAccountState,
): ActionRowBuilder<MessageActionRowComponentBuilder> {
	const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>();

	if (state.isIgnoredAccount) {
		actionRow.addComponents(
			new ButtonBuilder()
				.setCustomId(menuButtonIds.unignoreGloballyButton)
				.setLabel("Stop ignoring globally")
				.setStyle(ButtonStyle.Success),
		);
	} else {
		if (state.userServerSettings.flags.canPubliclyDisplayMessages) {
			actionRow.addComponents(
				new ButtonBuilder()
					.setCustomId(menuButtonIds.revokeConsentButton)
					.setLabel("Disable showing my messages on Answer Overflow")
					.setStyle(ButtonStyle.Danger),
			);
		} else {
			actionRow.addComponents(
				new ButtonBuilder()
					.setCustomId(menuButtonIds.consentButton)
					.setLabel("Publicly display my messages on Answer Overflow")
					.setStyle(ButtonStyle.Success),
			);
		}

		if (state.userServerSettings.flags.messageIndexingDisabled) {
			actionRow.addComponents(
				new ButtonBuilder()
					.setCustomId(menuButtonIds.enableMessageIndexingButton)
					.setLabel("Enable indexing my messages")
					.setStyle(ButtonStyle.Success),
			);
		} else {
			actionRow.addComponents(
				new ButtonBuilder()
					.setCustomId(menuButtonIds.disableMessageIndexingButton)
					.setLabel("Disable indexing my messages")
					.setStyle(ButtonStyle.Danger),
			);
		}

		actionRow.addComponents(
			new ButtonBuilder()
				.setCustomId(menuButtonIds.ignoreGloballyButton)
				.setLabel("Ignore globally")
				.setStyle(ButtonStyle.Danger),
		);
	}

	return actionRow;
}

export const handleManageAccountCommand = Effect.fn("manage_account_command")(
	function* (interaction: ChatInputCommandInteraction) {
		yield* Effect.annotateCurrentSpan({
			"discord.guild_id": interaction.guildId ?? "unknown",
			"discord.channel_id": interaction.channelId ?? "unknown",
			"discord.user_id": interaction.user.id,
		});
		yield* Metric.increment(commandExecuted("manage_account"));

		const database = yield* Database;
		const discord = yield* Discord;

		if (!interaction.guildId || !interaction.member) {
			yield* discord.callClient(() =>
				interaction.reply({
					content: "This command can only be used in a server",
					flags: MessageFlags.Ephemeral,
				}),
			);
			return;
		}

		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: BigInt(interaction.guildId),
			},
		);

		const server = serverLiveData;

		if (!server) {
			yield* discord.callClient(() =>
				interaction.reply({
					content: "Server not found in database",
					flags: MessageFlags.Ephemeral,
				}),
			);
			return;
		}

		const userIdBigInt = BigInt(interaction.user.id);
		const serverIdBigInt = server.discordId;

		const userServerSettingsLiveData =
			yield* database.private.user_server_settings.findUserServerSettingsById({
				userId: userIdBigInt,
				serverId: serverIdBigInt,
			});

		const userServerSettingsRaw = userServerSettingsLiveData;

		const userServerSettings: UserServerSettingsWithFlags =
			userServerSettingsRaw
				? {
						...userServerSettingsRaw,
						userId: userServerSettingsRaw.userId.toString(),
						serverId: userServerSettingsRaw.serverId.toString(),
						flags: {
							canPubliclyDisplayMessages:
								userServerSettingsRaw.canPubliclyDisplayMessages,
							messageIndexingDisabled:
								userServerSettingsRaw.messageIndexingDisabled,
						},
					}
				: getDefaultUserServerSettingsWithFlags({
						userId: interaction.user.id,
						serverId: server.discordId.toString(),
					});

		const ignoredAccount =
			yield* database.private.ignored_discord_accounts.findIgnoredDiscordAccountById(
				{
					id: userIdBigInt,
				},
			);
		const isIgnoredAccount = ignoredAccount !== null;

		const state: ManageAccountState = {
			userServerSettings,
			isIgnoredAccount,
		};

		const embed = generateManageAccountEmbed(state);
		const actionRow = generateManageAccountActionRow(state);

		const reply = yield* discord.callClient(() =>
			interaction.reply({
				embeds: [embed],
				components: [actionRow],
				flags: MessageFlags.Ephemeral,
			}),
		);
		const collector = reply.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 5 * 60 * 1000, // 5 minutes
			filter: (i) =>
				i.user.id === interaction.user.id &&
				Object.values(menuButtonIds).includes(
					i.customId as (typeof menuButtonIds)[keyof typeof menuButtonIds],
				),
		});

		collector.on("collect", async (buttonInteraction) => {
			const member = buttonInteraction.member;
			await Effect.runPromise(
				handleManageAccountButtonPress(
					buttonInteraction,
					database,
					userIdBigInt,
					serverIdBigInt,
					state,
					member instanceof Object && "id" in member
						? (member as GuildMember)
						: undefined,
				),
			);

			const updatedEmbed = generateManageAccountEmbed(state);
			const updatedActionRow = generateManageAccountActionRow(state);
			await buttonInteraction
				.update({
					embeds: [updatedEmbed],
					components: [updatedActionRow],
				})
				.catch((error) => {
					console.error("Error updating interaction:", error);
				});
		});
	},
);

function handleManageAccountButtonPress(
	interaction: { customId: string },
	database: Effect.Effect.Success<typeof Database>,
	userId: bigint,
	serverId: bigint,
	state: ManageAccountState,
	member?: GuildMember,
) {
	return Effect.gen(function* () {
		const customId =
			interaction.customId as (typeof menuButtonIds)[keyof typeof menuButtonIds];

		switch (customId) {
			case menuButtonIds.consentButton:
			case menuButtonIds.revokeConsentButton: {
				const canPubliclyDisplayMessages =
					customId === menuButtonIds.consentButton;

				const existingSettingsLiveData =
					yield* database.private.user_server_settings.findUserServerSettingsById(
						{
							userId,
							serverId,
						},
					);

				const existingSettings = existingSettingsLiveData;

				const updatedSettings = existingSettings
					? {
							userId: existingSettings.userId,
							serverId: existingSettings.serverId,
							permissions: existingSettings.permissions,
							canPubliclyDisplayMessages,
							messageIndexingDisabled: existingSettings.messageIndexingDisabled,
							apiKey: existingSettings.apiKey,
							apiCallsUsed: existingSettings.apiCallsUsed,
							botAddedTimestamp: existingSettings.botAddedTimestamp,
						}
					: {
							userId,
							serverId,
							permissions: 0,
							canPubliclyDisplayMessages,
							messageIndexingDisabled: false,
							apiCallsUsed: 0,
						};

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: updatedSettings,
				});

				if (canPubliclyDisplayMessages && member) {
					yield* catchAllSilentWithReport(
						trackUserGrantConsent(member, ConsentSource.ManageAccountMenu).pipe(
							Effect.provide(PostHogCaptureClientLayer),
						),
					);
				}

				state.userServerSettings.flags.canPubliclyDisplayMessages =
					canPubliclyDisplayMessages;
				state.userServerSettings.canPubliclyDisplayMessages =
					canPubliclyDisplayMessages;
				break;
			}

			case menuButtonIds.enableMessageIndexingButton:
			case menuButtonIds.disableMessageIndexingButton: {
				const messageIndexingDisabled =
					customId === menuButtonIds.disableMessageIndexingButton;

				const existingSettingsLiveData =
					yield* database.private.user_server_settings.findUserServerSettingsById(
						{
							userId,
							serverId,
						},
					);

				const existingSettings = existingSettingsLiveData;

				const updatedSettings = existingSettings
					? {
							userId: existingSettings.userId,
							serverId: existingSettings.serverId,
							permissions: existingSettings.permissions,
							canPubliclyDisplayMessages: messageIndexingDisabled
								? false
								: existingSettings.canPubliclyDisplayMessages,
							messageIndexingDisabled,
							apiKey: existingSettings.apiKey,
							apiCallsUsed: existingSettings.apiCallsUsed,
							botAddedTimestamp: existingSettings.botAddedTimestamp,
						}
					: {
							userId,
							serverId,
							permissions: 0,
							canPubliclyDisplayMessages: false,
							messageIndexingDisabled,
							apiCallsUsed: 0,
						};

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: updatedSettings,
				});

				state.userServerSettings.flags.messageIndexingDisabled =
					messageIndexingDisabled;
				state.userServerSettings.messageIndexingDisabled =
					messageIndexingDisabled;
				if (messageIndexingDisabled) {
					state.userServerSettings.flags.canPubliclyDisplayMessages = false;
					state.userServerSettings.canPubliclyDisplayMessages = false;
				}
				break;
			}

			case menuButtonIds.ignoreGloballyButton:
			case menuButtonIds.unignoreGloballyButton: {
				if (customId === menuButtonIds.ignoreGloballyButton) {
					yield* database.private.discord_accounts.deleteDiscordAccount({
						id: userId,
					});
					state.isIgnoredAccount = true;
				} else {
					yield* database.private.ignored_discord_accounts.deleteIgnoredDiscordAccount(
						{
							id: userId,
						},
					);
					state.isIgnoredAccount = false;
				}
				break;
			}
		}
	});
}

export const ManageAccountCommandHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					!interaction.isChatInputCommand() ||
					interaction.commandName !== "manage-account"
				) {
					return;
				}
				yield* handleManageAccountCommand(interaction);
			}),
		);
	}),
);
