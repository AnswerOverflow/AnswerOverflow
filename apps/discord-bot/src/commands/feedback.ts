import type {
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

const FEEDBACK_MODAL_ID = "feedback-modal";
const FEEDBACK_INPUT_ID = "feedback-input";

export const handleFeedbackCommand = Effect.fn("feedback_command")(function* (
	interaction: ChatInputCommandInteraction,
) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": interaction.guildId ?? "unknown",
		"discord.channel_id": interaction.channelId ?? "unknown",
		"discord.user_id": interaction.user.id,
	});
	yield* Metric.increment(commandExecuted("feedback"));

	const discord = yield* Discord;

	const modal = new ModalBuilder()
		.setCustomId(FEEDBACK_MODAL_ID)
		.setTitle("Feedback")
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				"**This is for providing feedback about the Answer Overflow bot or answeroverflow.com website.**\n\nThis is NOT for feedback about the topic of this Discord server.",
			),
		)
		.addLabelComponents(
			new LabelBuilder()
				.setLabel("Your feedback")
				.setTextInputComponent(
					new TextInputBuilder()
						.setCustomId(FEEDBACK_INPUT_ID)
						.setPlaceholder(
							"Share your thoughts about answeroverflow.com or the bot...",
						)
						.setStyle(TextInputStyle.Paragraph)
						.setRequired(true)
						.setMaxLength(4000),
				),
		);

	yield* discord.callClient(() => interaction.showModal(modal));
});

export const handleFeedbackModalSubmit = Effect.fn("feedback_modal_submit")(
	function* (interaction: ModalSubmitInteraction) {
		yield* Effect.annotateCurrentSpan({
			"discord.guild_id": interaction.guildId ?? "unknown",
			"discord.channel_id": interaction.channelId ?? "unknown",
			"discord.user_id": interaction.user.id,
		});
		yield* Metric.increment(commandExecuted("feedback_modal_submit"));

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
	},
);

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
