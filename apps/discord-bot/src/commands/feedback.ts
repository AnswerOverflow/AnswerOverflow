import type {
	ChatInputCommandInteraction,
	ModalSubmitInteraction,
} from "discord.js";
import {
	ActionRowBuilder,
	EmbedBuilder,
	MessageFlags,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { Console, Effect, Layer } from "effect";
import { SUPER_USER_ID } from "../constants/super-user";
import { Discord } from "../core/discord-service";

const FEEDBACK_MODAL_ID = "feedback-modal";
const FEEDBACK_INPUT_ID = "feedback-input";

export function handleFeedbackCommand(
	interaction: ChatInputCommandInteraction,
) {
	return Effect.gen(function* () {
		const discord = yield* Discord;

		const modal = new ModalBuilder()
			.setCustomId(FEEDBACK_MODAL_ID)
			.setTitle("Send Feedback");

		const feedbackInput = new TextInputBuilder()
			.setCustomId(FEEDBACK_INPUT_ID)
			.setLabel("Your feedback")
			.setPlaceholder("Share your thoughts, suggestions, or ideas...")
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(true)
			.setMaxLength(4000);

		const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
			feedbackInput,
		);

		modal.addComponents(actionRow);

		yield* discord.callClient(() => interaction.showModal(modal));
	});
}

export function handleFeedbackModalSubmit(interaction: ModalSubmitInteraction) {
	return Effect.gen(function* () {
		const discord = yield* Discord;

		if (interaction.customId !== FEEDBACK_MODAL_ID) {
			return;
		}

		const feedback = interaction.fields.getTextInputValue(FEEDBACK_INPUT_ID);

		const embed = new EmbedBuilder()
			.setTitle("New Feedback Received")
			.setColor("#00D26A")
			.setTimestamp()
			.addFields(
				{
					name: "From",
					value: `${interaction.user.tag} (${interaction.user.id})`,
					inline: false,
				},
				{
					name: "Context",
					value: interaction.guildId
						? `Server: ${interaction.guild?.name ?? "Unknown"} (${interaction.guildId})`
						: "Direct Message",
					inline: false,
				},
				{
					name: "Feedback",
					value: feedback,
					inline: false,
				},
			);

		if (interaction.user.avatarURL()) {
			embed.setThumbnail(interaction.user.avatarURL());
		}

		yield* Effect.tryPromise({
			try: async () => {
				const superUser = await interaction.client.users.fetch(SUPER_USER_ID);
				await superUser.send({ embeds: [embed] });
			},
			catch: (error) => error,
		}).pipe(
			Effect.catchAll((error) =>
				Console.error("Failed to send feedback to super user:", error),
			),
		);

		yield* discord.callClient(() =>
			interaction.reply({
				content:
					"Thank you for your feedback! It has been sent to the Answer Overflow team.",
				flags: MessageFlags.Ephemeral,
			}),
		);
	});
}

export const FeedbackCommandHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					interaction.isChatInputCommand() &&
					interaction.commandName === "feedback"
				) {
					yield* handleFeedbackCommand(interaction);
					return;
				}

				if (
					interaction.isModalSubmit() &&
					interaction.customId === FEEDBACK_MODAL_ID
				) {
					yield* handleFeedbackModalSubmit(interaction);
					return;
				}
			}),
		);
	}),
);
