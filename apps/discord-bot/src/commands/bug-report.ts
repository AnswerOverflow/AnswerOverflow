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

const BUG_REPORT_MODAL_ID = "bug-report-modal";
const BUG_DESCRIPTION_INPUT_ID = "bug-description-input";
const STEPS_TO_REPRODUCE_INPUT_ID = "steps-to-reproduce-input";
const EXPECTED_BEHAVIOR_INPUT_ID = "expected-behavior-input";

export const handleBugReportCommand = Effect.fn("bug_report_command")(
	function* (interaction: ChatInputCommandInteraction) {
		yield* Effect.annotateCurrentSpan({
			"discord.guild_id": interaction.guildId ?? "unknown",
			"discord.channel_id": interaction.channelId ?? "unknown",
			"discord.user_id": interaction.user.id,
		});
		yield* Metric.increment(commandExecuted("bug_report"));

		const discord = yield* Discord;

		const modal = new ModalBuilder()
			.setCustomId(BUG_REPORT_MODAL_ID)
			.setTitle("Bug Report")
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					"**This is for reporting bugs with the Answer Overflow bot or answeroverflow.com website.**\n\nThis is NOT for reporting issues with the topic of this Discord server.",
				),
			)
			.addLabelComponents(
				new LabelBuilder()
					.setLabel("Bug Description")
					.setTextInputComponent(
						new TextInputBuilder()
							.setCustomId(BUG_DESCRIPTION_INPUT_ID)
							.setPlaceholder("Describe the issue with the bot or website...")
							.setStyle(TextInputStyle.Paragraph)
							.setRequired(true)
							.setMaxLength(1000),
					),
			)
			.addLabelComponents(
				new LabelBuilder()
					.setLabel("Steps to Reproduce (Optional)")
					.setTextInputComponent(
						new TextInputBuilder()
							.setCustomId(STEPS_TO_REPRODUCE_INPUT_ID)
							.setPlaceholder("1. Go to...\n2. Click on...\n3. See error...")
							.setStyle(TextInputStyle.Paragraph)
							.setRequired(false)
							.setMaxLength(1000),
					),
			)
			.addLabelComponents(
				new LabelBuilder()
					.setLabel("Expected Behavior (Optional)")
					.setTextInputComponent(
						new TextInputBuilder()
							.setCustomId(EXPECTED_BEHAVIOR_INPUT_ID)
							.setPlaceholder("What did you expect to happen?")
							.setStyle(TextInputStyle.Paragraph)
							.setRequired(false)
							.setMaxLength(1000),
					),
			);

		yield* discord.callClient(() => interaction.showModal(modal));
	},
);

export const handleBugReportModalSubmit = Effect.fn("bug_report_modal_submit")(
	function* (interaction: ModalSubmitInteraction) {
		yield* Effect.annotateCurrentSpan({
			"discord.guild_id": interaction.guildId ?? "unknown",
			"discord.channel_id": interaction.channelId ?? "unknown",
			"discord.user_id": interaction.user.id,
		});
		yield* Metric.increment(commandExecuted("bug_report_modal_submit"));

		const discord = yield* Discord;

		if (interaction.customId !== BUG_REPORT_MODAL_ID) {
			return;
		}

		const bugDescription = interaction.fields.getTextInputValue(
			BUG_DESCRIPTION_INPUT_ID,
		);
		const stepsToReproduce =
			interaction.fields.getTextInputValue(STEPS_TO_REPRODUCE_INPUT_ID) ||
			"*Not provided*";
		const expectedBehavior =
			interaction.fields.getTextInputValue(EXPECTED_BEHAVIOR_INPUT_ID) ||
			"*Not provided*";

		const embed = new EmbedBuilder()
			.setTitle("New Bug Report")
			.setColor("#FF6B6B")
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
					name: "Bug Description",
					value: bugDescription,
					inline: false,
				},
				{
					name: "Steps to Reproduce",
					value: stepsToReproduce,
					inline: false,
				},
				{
					name: "Expected Behavior",
					value: expectedBehavior,
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
				Console.error("Failed to send bug report to super user:", error),
			),
		);

		yield* discord.callClient(() =>
			interaction.reply({
				content:
					"Thank you for your bug report! It has been sent to the Answer Overflow team.",
				flags: MessageFlags.Ephemeral,
			}),
		);
	},
);

export const BugReportCommandHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					interaction.isChatInputCommand() &&
					interaction.commandName === "bug-report"
				) {
					yield* handleBugReportCommand(interaction);
					return;
				}

				if (
					interaction.isModalSubmit() &&
					interaction.customId === BUG_REPORT_MODAL_ID
				) {
					yield* handleBugReportModalSubmit(interaction);
					return;
				}
			}),
		);
	}),
);
