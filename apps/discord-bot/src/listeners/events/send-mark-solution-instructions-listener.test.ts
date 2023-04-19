import { Client, Events, PublicThreadChannel } from 'discord.js';
import { createChannel, createServer } from '@answeroverflow/db';
import {
	mockForumChannel,
	mockMessage,
	mockPublicThread,
	mockTextChannel,
} from '@answeroverflow/discordjs-mock';
import { setupAnswerOverflowBot } from '~discord-bot/test/sapphire-mock';
import { toAOChannel, toAOServer } from '~discord-bot/utils/conversions';
import { emitEvent } from '@answeroverflow/discordjs-mock';

let client: Client;
let textChannelThread: PublicThreadChannel;
let forumChannelThread: PublicThreadChannel;
beforeEach(async () => {
	client = await setupAnswerOverflowBot();
	const textChannel = mockTextChannel(client);
	const forumChannel = mockForumChannel(client);
	textChannelThread = mockPublicThread({
		client,
		parentChannel: textChannel,
	});
	mockMessage({
		client,
		channel: textChannel,
		override: {
			id: textChannelThread.id,
		},
	});
	forumChannelThread = mockPublicThread({
		client,
		parentChannel: forumChannel,
	});
	mockMessage({
		client,
		channel: forumChannelThread,
		override: {
			id: forumChannelThread.id,
		},
	});
	await createServer(toAOServer(textChannel.guild));
	await createServer(toAOServer(forumChannel.guild));
});

describe('Send mark solution instructions', () => {
	it('should send mark solution instructions in a text channel thread', async () => {
		await createChannel({
			...toAOChannel(textChannelThread.parent!),
			flags: {
				markSolutionEnabled: true,
				sendMarkSolutionInstructionsInNewThreads: true,
			},
		});
		await emitEvent(client, Events.ThreadCreate, textChannelThread, true);
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
	it('should send mark solution instructions in a forum channel thread', async () => {
		await createChannel({
			...toAOChannel(forumChannelThread.parent!),
			flags: {
				markSolutionEnabled: true,
				sendMarkSolutionInstructionsInNewThreads: true,
			},
		});
		await emitEvent(client, Events.ThreadCreate, forumChannelThread, true);
		const sentMessage = forumChannelThread.messages.cache.find(
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
