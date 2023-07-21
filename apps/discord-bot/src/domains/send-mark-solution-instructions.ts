import { type ChannelWithFlags, findServerById } from '@answeroverflow/db';
import {
	ActionRowBuilder,
	EmbedBuilder,
	GuildMember,
	Message,
	type MessageActionRowComponentBuilder,
	ThreadChannel,
} from 'discord.js';
import {
	channelWithDiscordInfoToAnalyticsData,
	memberToAnalyticsUser,
	messageToAnalyticsMessage,
	serverWithDiscordInfoToAnalyticsData,
	threadWithDiscordInfoToAnalyticsData,
	trackDiscordEvent,
} from '~discord-bot/utils/analytics';
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
	threadOwner: GuildMember,
	question: Message | null,
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
			'https://cdn.discordapp.com/attachments/1037547185492996210/1098915406627999764/mark_solution_instructions.png',
		);
	await thread.send({
		embeds: [markSolutionInstructionsEmbed],
		components: [
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				makeDismissButton(threadOwner.id),
			),
		],
	});
	trackDiscordEvent('Mark Solution Instructions Sent', async () => {
		const server = await findServerById(thread.guildId);
		return {
			...memberToAnalyticsUser('Question Asker', threadOwner),
			...(question && messageToAnalyticsMessage('Question', question)),
			'Answer Overflow Account Id': threadOwner.id,
			...threadWithDiscordInfoToAnalyticsData({ thread }),
			...channelWithDiscordInfoToAnalyticsData({
				answerOverflowChannel: channelSettings,
				discordChannel: thread.parent!, // If we have channel settings, this channel must exist
			}),
			...serverWithDiscordInfoToAnalyticsData({
				guild: thread.guild,
				serverWithSettings: server!,
			}),
		};
	});
}
