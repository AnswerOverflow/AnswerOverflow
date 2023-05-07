import type { Client, TextChannel } from 'discord.js';
import {
	extractThreadsSetFromMessages,
	extractUsersSetFromMessages,
	messagesToAOMessagesSet,
} from './conversions';
import {
	mockTextChannel,
	mockMessages,
	mockUser,
	mockMessage,
	mockThreadFromParentMessage,
} from '@answeroverflow/discordjs-mock';
import { setupAnswerOverflowBot } from '~discord-bot/test/sapphire-mock';

let textChannel: TextChannel;
let client: Client;
beforeEach(async () => {
	client = await setupAnswerOverflowBot();
	textChannel = mockTextChannel(client);
});

describe('Extract Users Set From Messages', () => {
	it('should extract users from messages', () => {
		const messages = mockMessages(textChannel, 10);
		const users = extractUsersSetFromMessages(messages);
		expect(users.length).toBe(10);
	});
	it('should not extract duplicate users', () => {
		const author = mockUser(client);
		const msg1 = mockMessage({
			client,
			author,
		});
		const msg2 = mockMessage({
			client,
			author,
		});
		const users = extractUsersSetFromMessages([msg1, msg2]);
		expect(users.length).toBe(1);
	});
});

describe('Extract Threads Set From Messages', () => {
	it('should extract threads from messages', () => {
		const msgWithThread = mockMessage({ client });
		const msgWithoutThread = mockMessage({ client });
		mockThreadFromParentMessage({
			client,
			parentMessage: msgWithThread,
		});
		const threads = extractThreadsSetFromMessages([
			msgWithThread,
			msgWithoutThread,
		]);
		expect(threads.length).toBe(1);
	});
	it('should not extract duplicate threads', () => {
		const msgWithThread = mockMessage({ client });
		mockThreadFromParentMessage({
			client,
			parentMessage: msgWithThread,
		});
		const threads = extractThreadsSetFromMessages([
			msgWithThread,
			msgWithThread,
		]);
		expect(threads.length).toBe(1);
	});
});
describe('Messages To AO Messages Set', () => {
	it('should convert messages to AO messages', async () => {
		const messages = mockMessages(textChannel, 10);
		const aoMessages = await messagesToAOMessagesSet(messages);
		expect(aoMessages.length).toBe(10);
	});
	it('should not convert duplicate messages', async () => {
		const msg1 = mockMessage({ client });
		const aoMessages = await messagesToAOMessagesSet([msg1, msg1]);
		expect(aoMessages.length).toBe(1);
	});
});
