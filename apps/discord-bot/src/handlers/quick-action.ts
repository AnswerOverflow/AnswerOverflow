import { Database } from "@packages/database/database";
import type { ContextMenuCommandInteraction, GuildMember } from "discord.js";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	type MessageActionRowComponentBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} from "discord.js";
import { Array as Arr, Console, Effect, Layer, Predicate } from "effect";
import { Discord } from "../core/discord-service";

const ANSWER_OVERFLOW_BLUE_HEX = "#8CD1FF";
const DISMISS_ACTION_PREFIX = "dismiss";
const DISMISS_BUTTON_LABEL = "Dismiss";

function makeDismissButton(dismisserId: string): ButtonBuilder {
	return new ButtonBuilder({
		label: DISMISS_BUTTON_LABEL,
		style: ButtonStyle.Secondary,
		customId: `${DISMISS_ACTION_PREFIX}:${dismisserId}`,
	});
}

export function handleQuickActionCommand(
	interaction: ContextMenuCommandInteraction,
) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const discord = yield* Discord;

		if (!interaction.channel) {
			return;
		}

		const targetMessage = yield* discord.callClient(() =>
			interaction.channel?.messages.fetch(interaction.targetId),
		);

		if (!targetMessage) {
			return;
		}

		if (!interaction.member) {
			return;
		}

		if (!interaction.guildId) {
			return;
		}

		const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>();
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId("quickActionSelect")
			.setPlaceholder("Choose the response that will be the most help");

		const option = new StringSelectMenuOptionBuilder()
			.setLabel("Use help channels")
			.setValue("use-help-channels")
			.setDescription("Redirects user to the help channels");

		selectMenu.addOptions(option);
		actionRow.addComponents(selectMenu);

		const interactionReply = yield* discord.callClient(() =>
			interaction.reply({
				ephemeral: true,
				content: "Select an action to perform on this message.",
				components: [actionRow],
			}),
		);

		const selectedAction = yield* Effect.tryPromise({
			try: () =>
				interactionReply.awaitMessageComponent({
					componentType: ComponentType.StringSelect,
					time: 5 * 60 * 1000,
					filter: (i) => i.user.id === interaction.user.id,
				}),
			catch: () => null,
		});

		if (!selectedAction) {
			return;
		}

		const requestor = interaction.user;
		const requestorAsMember = interaction.inCachedGuild()
			? interaction.member
			: null;

		const allServerChannels =
			yield* database.private.channels.findAllChannelsByServerId({
				serverId: BigInt(interaction.guildId),
			});

		const indexedChannels = Arr.filter(
			allServerChannels,
			(channel) => channel.flags.indexingEnabled,
		);

		const guild = interaction.guild;
		if (!guild) {
			return;
		}

		const channelsTargetAuthorCanSee = yield* Effect.tryPromise({
			try: async () => {
				const results = await Promise.all(
					indexedChannels.map(async (channel) => {
						try {
							const discordChannel = await guild.channels.fetch(
								channel.id.toString(),
							);
							if (!discordChannel) return null;
							if (!targetMessage.author) return null;

							let authorMember: GuildMember;
							try {
								authorMember = await guild.members.fetch(
									targetMessage.author.id,
								);
							} catch {
								return null;
							}

							const canView =
								discordChannel
									.permissionsFor(authorMember)
									?.has("ViewChannel") ?? false;
							const canSend =
								discordChannel
									.permissionsFor(authorMember)
									?.has("SendMessages") ?? false;

							if (canView && canSend) {
								return channel;
							}
							return null;
						} catch {
							return null;
						}
					}),
				);
				return results;
			},
			catch: (error) => new Error(`Failed to fetch channels: ${error}`),
		});

		const filteredChannels = Arr.filter(
			channelsTargetAuthorCanSee,
			Predicate.isNotNull,
		);

		const channelList =
			filteredChannels.length > 0
				? Arr.map(filteredChannels, (channel) => `- <#${channel.id}>`).join(
						"\n",
					)
				: "No indexed help channels available.";

		const embed = new EmbedBuilder()
			.setTitle("Post in another channel")
			.setDescription(
				`Hey <@${targetMessage.author.id}>! It looks like this may not be the right channel for this, please copy your message into one of the following channels:\n\n${channelList}\n\nThis helps to keep discussions organized and allows others to find your post.`,
			)
			.setColor(ANSWER_OVERFLOW_BLUE_HEX as `#${string}`)
			.setFooter({
				text: `Requested by ${requestorAsMember?.displayName ?? requestor.username}`,
				iconURL:
					requestorAsMember?.displayAvatarURL() ?? requestor.displayAvatarURL(),
			});

		const dismissRow =
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				makeDismissButton(targetMessage.author.id),
			);

		yield* discord.callClient(() =>
			targetMessage.reply({
				embeds: [embed],
				components: [dismissRow],
			}),
		);

		yield* discord.callClient(() => interaction.deleteReply());
	});
}

export const QuickActionCommandHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					interaction.isContextMenuCommand() &&
					interaction.commandName === "Quick Action"
				) {
					yield* handleQuickActionCommand(interaction).pipe(
						Effect.catchAll((error) =>
							Console.error("Error in quick action handler:", error),
						),
					);
				}
			}),
		);
	}),
);
