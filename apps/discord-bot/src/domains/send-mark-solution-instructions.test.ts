import type {
	Client,
	GuildMember,
	Message,
	PublicThreadChannel,
} from 'discord.js';
import { createChannel, createServer } from '@answeroverflow/db';
import {
	mockForumChannel,
	mockGuildMember,
	mockPublicThread,
	mockTextChannel,
	mockMessage,
} from '@answeroverflow/discordjs-mock';
import { setupAnswerOverflowBot } from '~discord-bot/test/sapphire-mock';
import { toAOChannel, toAOServer } from '~discord-bot/utils/conversions';
import { sendMarkSolutionInstructionsInThread } from './send-mark-solution-instructions';
import { mockChannelWithFlags } from '@answeroverflow/db-mock';

let client: Client;
let textChannelThread: PublicThreadChannel;
let questionAsker: GuildMember;
let threadQuestion: Message;
beforeEach(async () => {
	client = await setupAnswerOverflowBot();
	const textChannel = mockTextChannel(client);
	const forumChannel = mockForumChannel(client);
	textChannelThread = mockPublicThread({
		client,
		parentChannel: textChannel,
	});
	questionAsker = mockGuildMember({
		guild: textChannel.guild,
		client,
	});
	threadQuestion = mockMessage({
		client,
		author: questionAsker.user,
		channel: textChannelThread,
	});
	await createServer(toAOServer(textChannel.guild));
	await createServer(toAOServer(forumChannel.guild));
});

describe('Send mark solution instructions', () => {
	it('should not send mark solution instructions if thread is not newly created', async () => {
		await expect(
			sendMarkSolutionInstructionsInThread(
				textChannelThread,
				false,
				mockChannelWithFlags(toAOServer(textChannelThread.guild), {
					...toAOChannel(textChannelThread.parent!),
					flags: {
						markSolutionEnabled: true,
						sendMarkSolutionInstructionsInNewThreads: true,
					},
				}),
				questionAsker,
				threadQuestion,
			),
		).rejects.toThrowError('Thread was not newly created');
	});
	it('should not send mark solution instructions if channel does not have sendMarkSolutionInstructionsInNewThreads flag set', async () => {
		const cs = await createChannel({
			...toAOChannel(textChannelThread.parent!),
			flags: {
				markSolutionEnabled: true,
				sendMarkSolutionInstructionsInNewThreads: false,
			},
		});
		await expect(
			sendMarkSolutionInstructionsInThread(
				textChannelThread,
				true,
				cs,
				questionAsker,
				threadQuestion,
			),
		).rejects.toThrowError(
			'Channel does not have sendMarkSolutionInstructionsInNewThreads flag set',
		);
	});
	it('should successfully send mark solution instructions if thread is newly created', async () => {
		const cs = await createChannel({
			...toAOChannel(textChannelThread.parent!),
			flags: {
				markSolutionEnabled: true,
				sendMarkSolutionInstructionsInNewThreads: true,
			},
		});
		await sendMarkSolutionInstructionsInThread(
			textChannelThread,
			true,
			cs,
			questionAsker,
			threadQuestion,
		);
		const sentMessage = textChannelThread.messages.cache.find(
			(message) => message.embeds.length > 0,
		);
		expect(sentMessage).toBeDefined();
		const instructionEmbed = sentMessage?.embeds.find((embed) =>
			embed.description?.includes('help others find answers, you can mark'),
		);
		expect(instructionEmbed).toBeDefined();
		expect(instructionEmbed?.image?.url).toBe(
			'https://cdn.discordapp.com/attachments/1020132770862874704/1025906507549790208/mark_solution_instructions.png',
		);
	});
});
