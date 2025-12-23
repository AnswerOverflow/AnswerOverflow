import { Database } from "@packages/database/database";
import type { ContextMenuCommandInteraction } from "discord.js";
import {
	ActionRowBuilder,
	ComponentType,
	EmbedBuilder,
	type MessageActionRowComponentBuilder,
	MessageFlags,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} from "discord.js";
import {
	Array as Arr,
	Console,
	Effect,
	Layer,
	Metric,
	Option,
	Predicate,
} from "effect";
import { Discord } from "../core/discord-service";
import { commandExecuted } from "../metrics";
import { trackQuickActionCommandSent } from "../utils/analytics";
import {
	ANSWER_OVERFLOW_BLUE_HEX,
	makeDismissButton,
} from "../utils/discord-components";
import {
	catchAllSilentWithReport,
	catchAllSucceedNullWithReport,
	catchAllWithReport,
} from "../utils/error-reporting";

export const handleQuickActionCommand = Effect.fn("interaction.quick_action")(
	function* (interaction: ContextMenuCommandInteraction) {
		yield* Effect.annotateCurrentSpan({
			"discord.guild_id": interaction.guildId ?? "unknown",
			"discord.channel_id": interaction.channelId ?? "unknown",
			"discord.user_id": interaction.user.id,
			"interaction.command_name": interaction.commandName,
		});
		yield* Metric.increment(commandExecuted("quick_action"));

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
				flags: MessageFlags.Ephemeral,
				content: "Select an action to perform on this message.",
				components: [actionRow],
			}),
		);

		const selectedAction = yield* discord
			.callClient(() =>
				interactionReply.awaitMessageComponent({
					componentType: ComponentType.StringSelect,
					time: 5 * 60 * 1000,
					filter: (i) => i.user.id === interaction.user.id,
				}),
			)
			.pipe(Effect.option);

		if (Option.isNone(selectedAction)) {
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

		if (!targetMessage.author) {
			return;
		}

		const authorMember = yield* discord
			.callClient(() => guild.members.fetch(targetMessage.author.id))
			.pipe(Effect.option);

		if (Option.isNone(authorMember)) {
			return;
		}

		const member = authorMember.value;

		const checkChannelAccess = (channel: (typeof indexedChannels)[number]) =>
			catchAllSucceedNullWithReport(
				discord.callClient(async () => {
					const discordChannel = await guild.channels.fetch(
						channel.id.toString(),
					);
					if (!discordChannel) return null;

					const canView =
						discordChannel.permissionsFor(member)?.has("ViewChannel") ?? false;
					const canSend =
						discordChannel.permissionsFor(member)?.has("SendMessages") ?? false;

					if (canView && canSend) {
						return channel;
					}
					return null;
				}),
			);

		const channelsTargetAuthorCanSee = yield* Effect.all(
			Arr.map(indexedChannels, checkChannelAccess),
			{ concurrency: "unbounded" },
		);

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

		if (requestorAsMember) {
			yield* catchAllSilentWithReport(
				trackQuickActionCommandSent(requestorAsMember),
			);
		}

		yield* discord.callClient(() => interaction.deleteReply());
	},
);

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
						catchAllWithReport((error) =>
							Console.error("Error in quick action handler:", error),
						),
					);
				}
			}),
		);
	}),
);
