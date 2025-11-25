import type { Database } from "@packages/database/database";
import type { GuildMember, Message, ThreadChannel } from "discord.js";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	type MessageActionRowComponentBuilder,
} from "discord.js";
import { Effect } from "effect";

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

export class SendMarkSolutionInstructionsError extends Error {
	constructor(
		public reason: string,
		message: string,
	) {
		super(message);
		this.name = "SendMarkSolutionInstructionsError";
	}
}

export function handleSendMarkSolutionInstructions(
	thread: ThreadChannel,
	newlyCreated: boolean,
	channelSettings: {
		flags: {
			sendMarkSolutionInstructionsInNewThreads: boolean;
		};
	} | null,
	threadOwner: GuildMember,
	_question: Message | null,
) {
	return Effect.gen(function* () {
		if (!channelSettings?.flags.sendMarkSolutionInstructionsInNewThreads) {
			return;
		}

		if (!newlyCreated) {
			return;
		}

		const embed = new EmbedBuilder()
			.setDescription(
				`To help others find answers, you can mark your question as solved via \`Right click solution message -> Apps -> ✅ Mark Solution\``,
			)
			.setImage(
				"https://cdn.discordapp.com/attachments/1037547185492996210/1098915406627999764/mark_solution_instructions.png",
			)
			.setColor(ANSWER_OVERFLOW_BLUE_HEX as `#${string}`);

		const components =
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				makeDismissButton(threadOwner.id),
			);

		yield* Effect.tryPromise({
			try: () =>
				thread.send({
					embeds: [embed],
					components: [components],
				}),
			catch: (error) => {
				console.error("Error sending mark solution instructions:", error);
				return new SendMarkSolutionInstructionsError(
					"send_failed",
					"Failed to send mark solution instructions",
				);
			},
		});

		console.log(
			`Sent mark solution instructions to thread ${thread.id} (owner: ${threadOwner.id})`,
		);
	});
}
