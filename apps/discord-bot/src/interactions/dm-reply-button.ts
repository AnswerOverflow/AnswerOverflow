import type { ButtonInteraction, ModalSubmitInteraction } from "discord.js";
import {
	ActionRowBuilder,
	EmbedBuilder,
	MessageFlags,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { Console, Effect, Layer, Metric } from "effect";
import { SUPER_USER_ID } from "../constants/super-user";
import { Discord } from "../core/discord-service";
import { eventsProcessed } from "../metrics";
import { DM_REPLY_ACTION_PREFIX } from "../utils/discord-components";
import { catchAllWithReport } from "../utils/error-reporting";

const DM_REPLY_MODAL_ID_PREFIX = "dm-reply-modal";
const DM_REPLY_INPUT_ID = "dm-reply-input";
const RHYS_AVATAR_URL =
	"https://cdn.discordapp.com/avatars/523949187663134754/7716e305f7de26045526d9da6eef2dab.webp";

function parseDmReplyButtonId(customId: string): string {
	const parts = customId.split(":");
	if (parts.length !== 2 || parts[0] !== DM_REPLY_ACTION_PREFIX) {
		throw new Error("Invalid DM reply button format");
	}
	const userId = parts[1];
	if (!userId) {
		throw new Error("Missing user ID in button customId");
	}
	return userId;
}

function parseDmReplyModalId(customId: string): string {
	const parts = customId.split(":");
	if (parts.length !== 2 || parts[0] !== DM_REPLY_MODAL_ID_PREFIX) {
		throw new Error("Invalid DM reply modal format");
	}
	const userId = parts[1];
	if (!userId) {
		throw new Error("Missing user ID in modal customId");
	}
	return userId;
}

const handleDmReplyButton = Effect.fn("interaction.dm_reply_button")(function* (
	interaction: ButtonInteraction,
) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": interaction.guildId ?? "unknown",
		"discord.channel_id": interaction.channelId ?? "unknown",
		"discord.user_id": interaction.user.id,
		"interaction.custom_id": interaction.customId,
	});
	yield* Metric.increment(eventsProcessed);

	const discord = yield* Discord;
	const userId = parseDmReplyButtonId(interaction.customId);

	const modal = new ModalBuilder()
		.setCustomId(`${DM_REPLY_MODAL_ID_PREFIX}:${userId}`)
		.setTitle("Reply to DM");

	const replyInput = new TextInputBuilder()
		.setCustomId(DM_REPLY_INPUT_ID)
		.setLabel("Your reply")
		.setPlaceholder("Type your response...")
		.setStyle(TextInputStyle.Paragraph)
		.setRequired(true)
		.setMaxLength(2000);

	const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
		replyInput,
	);

	modal.addComponents(actionRow);

	yield* discord.callClient(() => interaction.showModal(modal));
});

const handleDmReplyModalSubmit = Effect.fn("interaction.dm_reply_modal")(
	function* (interaction: ModalSubmitInteraction) {
		yield* Effect.annotateCurrentSpan({
			"discord.guild_id": interaction.guildId ?? "unknown",
			"discord.channel_id": interaction.channelId ?? "unknown",
			"discord.user_id": interaction.user.id,
			"interaction.custom_id": interaction.customId,
		});
		yield* Metric.increment(eventsProcessed);

		const discord = yield* Discord;
		const userId = parseDmReplyModalId(interaction.customId);
		const replyContent =
			interaction.fields.getTextInputValue(DM_REPLY_INPUT_ID);

		const targetUser = yield* Effect.tryPromise({
			try: () => interaction.client.users.fetch(userId),
			catch: (error) => new Error(`Failed to fetch user: ${error}`),
		});

		const embed = new EmbedBuilder()
			.setColor("#5865F2")
			.setAuthor({
				name: "Rhys",
				iconURL: RHYS_AVATAR_URL,
			})
			.setDescription(replyContent)
			.setTimestamp();

		const sendResult = yield* Effect.tryPromise({
			try: () => targetUser.send({ embeds: [embed] }),
			catch: (error) => new Error(`Failed to send DM: ${error}`),
		}).pipe(Effect.either);

		if (sendResult._tag === "Left") {
			yield* discord.callClient(() =>
				interaction.reply({
					content: `Could not send DM to ${targetUser.tag} - they may have DMs disabled or blocked the bot.`,
					flags: MessageFlags.Ephemeral,
				}),
			);
			return;
		}

		const sentEmbed = new EmbedBuilder()
			.setTitle("Reply Sent")
			.setColor("#00D26A")
			.setTimestamp()
			.addFields(
				{
					name: "To",
					value: `${targetUser.tag} (${targetUser.id})`,
					inline: false,
				},
				{
					name: "Content",
					value: replyContent,
					inline: false,
				},
			);

		if (targetUser.avatarURL()) {
			sentEmbed.setThumbnail(targetUser.avatarURL());
		}

		yield* Effect.tryPromise({
			try: async () => {
				const superUser = await interaction.client.users.fetch(SUPER_USER_ID);
				await superUser.send({ embeds: [sentEmbed] });
			},
			catch: (error) => new Error(`Failed to log reply: ${error}`),
		}).pipe(
			catchAllWithReport((error) =>
				Console.error("Failed to send reply log to super user:", error),
			),
		);

		yield* discord.callClient(() =>
			interaction.reply({
				content: `Reply sent to ${targetUser.tag}!`,
				flags: MessageFlags.Ephemeral,
			}),
		);
	},
);

export const DMReplyHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					interaction.isButton() &&
					interaction.customId.startsWith(`${DM_REPLY_ACTION_PREFIX}:`)
				) {
					yield* handleDmReplyButton(interaction).pipe(
						catchAllWithReport((error) =>
							Console.error("Error in DM reply button handler:", error),
						),
					);
					return;
				}

				if (
					interaction.isModalSubmit() &&
					interaction.customId.startsWith(`${DM_REPLY_MODAL_ID_PREFIX}:`)
				) {
					yield* handleDmReplyModalSubmit(interaction).pipe(
						catchAllWithReport((error) =>
							Console.error("Error in DM reply modal handler:", error),
						),
					);
					return;
				}
			}),
		);
	}),
);
