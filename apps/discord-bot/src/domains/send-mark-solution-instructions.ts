import { EmbedBuilder, ThreadChannel } from 'discord.js';
import type { ChannelWithFlags } from '@answeroverflow/db';
import {
	ActionRowBuilder,
	EmbedBuilder,
	MessageActionRowComponentBuilder,
	ThreadChannel,
} from 'discord.js';
import { makeDismissButton } from './dismiss-button';

const sendMarkSolutionInstructionsErrorReasons = [
	'Thread was not newly created',
	'Thread does not have a parent channel',
	'Channel not found',
	'Channel does not have sendMarkSolutionInstructionsInNewThreads flag set',
] as const;

export type SendMarkSolutionInstructionsErrorReason =
	(typeof sendMarkSolutionInstructionsErrorReasons)[number];

export class SendMarkSolutionInstructionsError extends Error {
	constructor(reason: SendMarkSolutionInstructionsErrorReason) {
		super(reason);
	}
}

export async function sendMarkSolutionInstructionsInThread(
	thread: ThreadChannel,
	newlyCreated: boolean,
	channelSettings: ChannelWithFlags,
) {
	if (!channelSettings.flags.sendMarkSolutionInstructionsInNewThreads) {
		throw new SendMarkSolutionInstructionsError(
			'Channel does not have sendMarkSolutionInstructionsInNewThreads flag set',
		);
	}
	if (!newlyCreated) {
		throw new SendMarkSolutionInstructionsError('Thread was not newly created');
	}

	const markSolutionInstructionsEmbed = new EmbedBuilder()
		.setDescription(
			`To help others find answers, you can mark your question as solved via \`Right click solution message -> Apps -> ✅ Mark Solution\``,
		)
		.setImage(
			'https://cdn.discordapp.com/attachments/1020132770862874704/1025906507549790208/mark_solution_instructions.png',
		);
	const firstMessage = await thread.fetchStarterMessage();
	await thread.send({
		embeds: [markSolutionInstructionsEmbed],
		components: [
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				makeDismissButton(firstMessage?.author.id ?? ''),
			),
		],
	});
}
