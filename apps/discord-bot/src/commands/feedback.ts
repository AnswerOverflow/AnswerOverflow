import type {
	ButtonInteraction,
	ChatInputCommandInteraction,
	ModalSubmitInteraction,
} from "discord.js";
import {
	EmbedBuilder,
	LabelBuilder,
	MessageFlags,
	ModalBuilder,
	TextDisplayBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { Console, Effect, Layer, Metric } from "effect";
import { SUPER_USER_ID } from "../constants/super-user";
import { Discord } from "../core/discord-service";
import { commandExecuted } from "../metrics";
import { catchAllWithReport } from "../utils/error-reporting";

export type FeedbackConfig = {
	modalId: string;
	inputId: string;
	title: string;
	description: string;
	placeholder: string;
	embedTitle: string;
	embedColor: `#${string}`;
};

export const DEFAULT_FEEDBACK_CONFIG: FeedbackConfig = {
	modalId: "feedback-modal",
	inputId: "feedback-input",
	title: "Feedback",
	description:
		"**This is for providing feedback about the Answer Overflow bot or answeroverflow.com website.**\n\nThis is NOT for feedback about the topic of this Discord server.",
	placeholder: "Share your thoughts about answeroverflow.com or the bot...",
	embedTitle: "New Feedback Received",
	embedColor: "#00D26A",
};

export const SIMILAR_THREADS_FEEDBACK_CONFIG: FeedbackConfig = {
	modalId: "similar-threads-feedback-modal",
	inputId: "similar-threads-feedback-input",
	title: "Similar Threads Feedback",
	description:
		"**How can we improve the similar threads feature?**\n\nLet us know if the results were helpful or how we can make them better.",
	placeholder: "Share your thoughts about the similar threads feature...",
	embedTitle: "Similar Threads Feedback",
	embedColor: "#8CD1FF",
};

export function createFeedbackModal(config: FeedbackConfig) {
	return new ModalBuilder()
		.setCustomId(config.modalId)
		.setTitle(config.title)
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(config.description),
		)
		.addLabelComponents(
			new LabelBuilder()
				.setLabel("Your feedback")
				.setTextInputComponent(
					new TextInputBuilder()
						.setCustomId(config.inputId)
						.setPlaceholder(config.placeholder)
						.setStyle(TextInputStyle.Paragraph)
						.setRequired(true)
						.setMaxLength(4000),
				),
		);
}

export const handleFeedbackModalSubmit = (config: FeedbackConfig) =>
	Effect.fn("feedback_modal_submit")(function* (
		interaction: ModalSubmitInteraction,
	) {
		yield* Effect.annotateCurrentSpan({
			"discord.guild_id": interaction.guildId ?? "unknown",
			"discord.channel_id": interaction.channelId ?? "unknown",
			"discord.user_id": interaction.user.id,
		});
		yield* Metric.increment(commandExecuted("feedback_modal_submit"));

		const discord = yield* Discord;

		const feedback = interaction.fields.getTextInputValue(config.inputId);

		const embed = new EmbedBuilder()
			.setTitle(config.embedTitle)
			.setColor(config.embedColor)
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
			catchAllWithReport((error) =>
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

export const showFeedbackModal = (config: FeedbackConfig) =>
	Effect.fn("show_feedback_modal")(function* (
		interaction: ChatInputCommandInteraction | ButtonInteraction,
	) {
		yield* Effect.annotateCurrentSpan({
			"discord.guild_id": interaction.guildId ?? "unknown",
			"discord.channel_id": interaction.channelId ?? "unknown",
			"discord.user_id": interaction.user.id,
		});
		yield* Metric.increment(commandExecuted("feedback"));

		const discord = yield* Discord;
		const modal = createFeedbackModal(config);
		yield* discord.callClient(() => interaction.showModal(modal));
	});

export const FeedbackCommandHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					interaction.isChatInputCommand() &&
					interaction.commandName === "feedback"
				) {
					yield* showFeedbackModal(DEFAULT_FEEDBACK_CONFIG)(interaction);
					return;
				}

				if (
					interaction.isModalSubmit() &&
					interaction.customId === DEFAULT_FEEDBACK_CONFIG.modalId
				) {
					yield* handleFeedbackModalSubmit(DEFAULT_FEEDBACK_CONFIG)(
						interaction,
					);
					return;
				}
			}),
		);
	}),
);
