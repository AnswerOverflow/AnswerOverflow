import type { Id } from "@packages/database/convex/_generated/dataModel";
import { Database, DatabaseLayer } from "@packages/database/database";
import type { ChatInputCommandInteraction } from "discord.js";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	type MessageActionRowComponentBuilder,
} from "discord.js";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";

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
	serverId: Id<"servers">;
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
	serverId: Id<"servers">;
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

export function handleManageAccountCommand(
	interaction: ChatInputCommandInteraction,
): Effect.Effect<void, unknown, Database> {
	return Effect.gen(function* () {
		const database = yield* Database;

		if (!interaction.guildId || !interaction.member) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.reply({
						content: "This command can only be used in a server",
						ephemeral: true,
					}),
				catch: () => undefined,
			});
			return;
		}

		const serverLiveData = yield* Effect.scoped(
			database.servers.getServerByDiscordId({ discordId: interaction.guildId }),
		);

		const server = serverLiveData;

		if (!server) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.reply({
						content: "Server not found in database",
						ephemeral: true,
					}),
				catch: () => undefined,
			});
			return;
		}

		const userServerSettingsLiveData = yield* Effect.scoped(
			database.user_server_settings.findUserServerSettingsById({
				userId: interaction.user.id,
				serverId: server._id,
			}),
		);

		const userServerSettingsRaw = userServerSettingsLiveData;

		const userServerSettings: UserServerSettingsWithFlags =
			userServerSettingsRaw
				? {
						...userServerSettingsRaw,
						flags: {
							canPubliclyDisplayMessages:
								userServerSettingsRaw.canPubliclyDisplayMessages,
							messageIndexingDisabled:
								userServerSettingsRaw.messageIndexingDisabled,
						},
					}
				: getDefaultUserServerSettingsWithFlags({
						userId: interaction.user.id,
						serverId: server._id,
					});

		const ignoredAccount =
			yield* database.ignored_discord_accounts.findIgnoredDiscordAccountById({
				id: interaction.user.id,
			});
		const isIgnoredAccount = ignoredAccount !== null;

		const state: ManageAccountState = {
			userServerSettings,
			isIgnoredAccount,
		};

		const embed = generateManageAccountEmbed(state);
		const actionRow = generateManageAccountActionRow(state);

		const reply = yield* Effect.tryPromise({
			try: () =>
				interaction.reply({
					embeds: [embed],
					components: [actionRow],
					ephemeral: true,
				}),
			catch: (error) => error,
		});

		if (
			reply &&
			typeof reply === "object" &&
			"createMessageComponentCollector" in reply
		) {
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
				await Effect.runPromise(
					Effect.scoped(
						handleManageAccountButtonPress(
							buttonInteraction,
							interaction.user.id,
							server._id,
							state,
						).pipe(
							Effect.provide(DatabaseLayer),
							Effect.catchAll((error) =>
								Effect.sync(() => {
									console.error("Error handling button press:", error);
								}),
							),
						),
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
		}
	});
}

function handleManageAccountButtonPress(
	interaction: { customId: string },
	userId: string,
	serverId: Id<"servers">,
	state: ManageAccountState,
): Effect.Effect<void, unknown, Database> {
	return Effect.gen(function* () {
		const database = yield* Database;

		const customId =
			interaction.customId as (typeof menuButtonIds)[keyof typeof menuButtonIds];

		switch (customId) {
			case menuButtonIds.consentButton:
			case menuButtonIds.revokeConsentButton: {
				const canPubliclyDisplayMessages =
					customId === menuButtonIds.consentButton;

				const existingSettingsLiveData = yield* Effect.scoped(
					database.user_server_settings.findUserServerSettingsById({
						userId,
						serverId,
					}),
				);

				const existingSettings = existingSettingsLiveData;

				const updatedSettings = existingSettings
					? {
							...existingSettings,
							canPubliclyDisplayMessages,
						}
					: {
							userId,
							serverId,
							permissions: 0,
							canPubliclyDisplayMessages,
							messageIndexingDisabled: false,
							apiCallsUsed: 0,
						};

				yield* database.user_server_settings.upsertUserServerSettings({
					settings: updatedSettings,
				});

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

				const existingSettingsLiveData = yield* Effect.scoped(
					database.user_server_settings.findUserServerSettingsById({
						userId,
						serverId,
					}),
				);

				const existingSettings = existingSettingsLiveData;

				const updatedSettings = existingSettings
					? {
							...existingSettings,
							messageIndexingDisabled,
							canPubliclyDisplayMessages: messageIndexingDisabled
								? false
								: existingSettings.canPubliclyDisplayMessages,
						}
					: {
							userId,
							serverId,
							permissions: 0,
							canPubliclyDisplayMessages: false,
							messageIndexingDisabled,
							apiCallsUsed: 0,
						};

				yield* database.user_server_settings.upsertUserServerSettings({
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
					yield* database.discord_accounts.deleteDiscordAccount({ id: userId });
					state.isIgnoredAccount = true;
				} else {
					yield* database.ignored_discord_accounts.deleteIgnoredDiscordAccount({
						id: userId,
					});
					state.isIgnoredAccount = false;
				}
				break;
			}
		}
	});
}

export const InteractionHandlersLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					!interaction.isChatInputCommand() ||
					interaction.commandName === "manage-account"
				) {
					return;
				}
				yield* Effect.scoped(
					handleManageAccountCommand(interaction).pipe(
						Effect.provide(DatabaseLayer),
						Effect.catchAll((error) =>
							Console.error("Error in manage account command:", error),
						),
					),
				);
			}),
		);
	}),
);
