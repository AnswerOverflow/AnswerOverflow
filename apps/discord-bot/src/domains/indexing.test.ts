import {
	type AnyThreadChannel,
	ChannelType,
	Client,
	ForumChannel,
	Message,
	MessageType,
	NewsChannel,
	TextChannel,
} from 'discord.js';
import {
	createChannel,
	createDiscordAccount,
	createServer,
	createUserServerSettings,
	findManyChannelsById,
	findManyDiscordAccountsById,
	findManyMessages,
	type Message as AOMessage,
	upsertChannel,
} from '@answeroverflow/db';
import {
	toAOChannel,
	toAODiscordAccount,
	toAOMessage,
	toAOServer,
} from '~discord-bot/utils/conversions';
import {
	addSolutionsToMessages,
	fetchAllMessages,
	filterMessages,
	findSolutionsToMessage,
	indexRootChannel,
} from './indexing';
import {
	mockTextChannel,
	mockForumChannel,
	mockNewsChannel,
	mockMessages,
	mockThreadFromParentMessage,
	mockMessage,
	mockPublicThread,
	mockMarkedAsSolvedReply,
	mockGuildMember,
} from '@answeroverflow/discordjs-mock';
import { randomSnowflake } from '@answeroverflow/discordjs-utils';
import { setupAnswerOverflowBot } from '~discord-bot/test/sapphire-mock';

let client: Client;
let textChannel: TextChannel;
let forumChannel: ForumChannel;
let newsChannel: NewsChannel;
beforeEach(async () => {
	client = await setupAnswerOverflowBot();
	textChannel = mockTextChannel(client);
	forumChannel = mockForumChannel(client);
	newsChannel = mockNewsChannel({ client });
});

async function validateIndexingResults(input: {
	messages: Message[];
	threads?: AnyThreadChannel[];
	expectedThreads: number;
	expectedUsers: number;
	expectedMessages: number;
}) {
	const {
		messages,
		threads = [],
		expectedThreads,
		expectedUsers,
		expectedMessages,
	} = input;
	const userIds = messages.map((msg) => msg.author.id);

	const fetchedUsers = await findManyDiscordAccountsById(userIds);
	expect(fetchedUsers.length).toBe(expectedUsers);

	const messageIds = messages.map((msg) => msg.id);
	const fetchedMessages = await findManyMessages(messageIds);
	expect(fetchedMessages.length).toBe(expectedMessages);

	const threadIds = threads.map((thread) => thread.id);
	const fetchedThreads = await findManyChannelsById(threadIds);
	expect(fetchedThreads.length).toBe(expectedThreads);
}

async function upsertChannelSettings(
	channel: TextChannel | ForumChannel | NewsChannel,
	opts: Parameters<typeof upsertChannel>[0]['update'] = {},
) {
	await createServer(toAOServer(channel.guild));
	return await createChannel({ ...toAOChannel(channel), ...opts });
}

describe('Indexing', () => {
	test.todo('Validate Message Fetch Options');
	describe('Index Root Channel', () => {
		it('should skip a channel with indexing disabled', async () => {
			const settings = await upsertChannelSettings(textChannel);
			expect(settings.flags.indexingEnabled).toBeFalsy();
			const messages = mockMessages(textChannel, 100);

			await indexRootChannel(textChannel);
			await validateIndexingResults({
				messages,
				expectedThreads: 0,
				expectedUsers: 0,
				expectedMessages: 0,
			});
		});
		it('should index a text channel', async () => {
			const settings = await upsertChannelSettings(textChannel, {
				flags: {
					indexingEnabled: true,
				},
			});
			expect(settings.flags.indexingEnabled).toBeTruthy();
			const messages = mockMessages(textChannel, 100);

			await indexRootChannel(textChannel);

			await validateIndexingResults({
				messages,
				expectedThreads: 0,
				expectedUsers: 100,
				expectedMessages: 100,
			});
		});
		it('should index a news channel', async () => {
			const settings = await upsertChannelSettings(newsChannel, {
				flags: {
					indexingEnabled: true,
				},
			});
			expect(settings.flags.indexingEnabled).toBeTruthy();
			const messages = mockMessages(newsChannel, 100);
			const thread1 = mockThreadFromParentMessage({
				client,
				parentMessage: messages[0]!,
				data: {
					type: ChannelType.AnnouncementThread,
				},
			});
			messages.push(...mockMessages(thread1, 10));
			const thread2 = mockThreadFromParentMessage({
				client,
				parentMessage: messages[1]!,
				data: {
					type: ChannelType.AnnouncementThread,
				},
			});
			messages.push(...mockMessages(thread2, 10));

			await indexRootChannel(newsChannel);

			await validateIndexingResults({
				messages,
				threads: [thread1, thread2],
				expectedThreads: 2,
				expectedUsers: 120,
				expectedMessages: 120,
			});
		});
		it('should index a forum channel', async () => {
			const settings = await upsertChannelSettings(forumChannel, {
				flags: {
					indexingEnabled: true,
				},
			});
			expect(settings.flags.indexingEnabled).toBeTruthy();
			const thread1 = mockPublicThread({
				client,
				parentChannel: forumChannel,
			});
			const thread2 = mockPublicThread({
				client,
				parentChannel: forumChannel,
			});
			const thread1Messages = mockMessages(thread1, 100);
			const thread2Messages = mockMessages(thread2, 100);
			const messages = [...thread1Messages, ...thread2Messages];

			await indexRootChannel(forumChannel);

			await validateIndexingResults({
				messages,
				threads: [thread1, thread2],
				expectedThreads: 2,
				expectedUsers: 200,
				expectedMessages: 200,
			});
		});
	});
	describe('Add Solutions To Messages', () => {
		let questionMessage: Message;
		let solutionMessage: Message;
		let markedAsSolvedReply: Message;
		let questionMessageAsAoMessage: AOMessage;
		let solutionMessageAsAoMessage: AOMessage;
		let markedAsSolvedReplyAsAoMessage: AOMessage;
		let messages: Message[];
		beforeEach(async () => {
			questionMessage = mockMessage({ client });
			solutionMessage = mockMessage({ client });
			markedAsSolvedReply = mockMarkedAsSolvedReply({
				client,
				questionId: questionMessage.id,
				solutionId: solutionMessage.id,
			});
			messages = [questionMessage, solutionMessage, markedAsSolvedReply];
			questionMessageAsAoMessage = await toAOMessage(questionMessage);
			solutionMessageAsAoMessage = await toAOMessage(solutionMessage);
			markedAsSolvedReplyAsAoMessage = await toAOMessage(markedAsSolvedReply);
		});
		it('should add solutions to messages with reply at the end', () => {
			addSolutionsToMessages(messages, [
				questionMessageAsAoMessage,
				solutionMessageAsAoMessage,
				markedAsSolvedReplyAsAoMessage,
			]);
			expect(questionMessageAsAoMessage.solutionIds).toEqual([
				solutionMessageAsAoMessage.id,
			]);
		});
		it('should add solutions to messages with reply in the middle', () => {
			addSolutionsToMessages(messages, [
				questionMessageAsAoMessage,
				markedAsSolvedReplyAsAoMessage,
				solutionMessageAsAoMessage,
			]);
			expect(questionMessageAsAoMessage.solutionIds).toEqual([
				solutionMessageAsAoMessage.id,
			]);
		});
		it('should add solutions to messages with reply at the beginning', () => {
			addSolutionsToMessages(messages, [
				markedAsSolvedReplyAsAoMessage,
				questionMessageAsAoMessage,
				solutionMessageAsAoMessage,
			]);
			expect(questionMessageAsAoMessage.solutionIds).toEqual([
				solutionMessageAsAoMessage.id,
			]);
		});
	});
	describe('Find Solutions To Messages', () => {
		it('should find solutions from a mark as solved reply', () => {
			const questionMessage = mockMessage({ client });
			const solutionMessage = mockMessage({ client });
			const markedAsSolvedReply = mockMarkedAsSolvedReply({
				client,
				questionId: questionMessage.id,
				solutionId: solutionMessage.id,
			});
			const { questionId, solutionId } =
				findSolutionsToMessage(markedAsSolvedReply);
			expect(questionId).toBe(questionMessage.id);
			expect(solutionId).toBe(solutionMessage.id);
		});
		it('should not find solutions on a regular message', () => {
			const regularMessage = mockMessage({ client });
			const { questionId, solutionId } = findSolutionsToMessage(regularMessage);
			expect(questionId).toBeNull();
			expect(solutionId).toBeNull();
		});
		it('should not find solutions from a mark as solved reply that is not sent by the bot', () => {
			const questionMessage = mockMessage({ client });
			const solutionMessage = mockMessage({ client });
			const markedAsSolvedReply = mockMarkedAsSolvedReply({
				client,
				questionId: questionMessage.id,
				solutionId: solutionMessage.id,
				override: {
					author: {
						id: randomSnowflake().toString(),
						avatar: '123',
						username: '123',
						discriminator: '123',
					},
				},
			});
			const { questionId, solutionId } =
				findSolutionsToMessage(markedAsSolvedReply);
			expect(questionId).toBeNull();
			expect(solutionId).toBeNull();
		});
	});
	describe('Filter Messages', () => {
		it('should filter system messages', async () => {
			const systemMsg = mockMessage({
				client,
				channel: textChannel,
				override: {
					type: MessageType.UserJoin,
				},
			});
			const filteredMessages = await filterMessages([systemMsg], textChannel);
			expect(filteredMessages.length).toBe(0);
		});
		it('should filter messages from users with message indexing disabled', async () => {
			const memberToIgnore = mockGuildMember({
				client,
				guild: textChannel.guild,
			});
			const messageToIgnore = mockMessage({
				client,
				channel: textChannel,
				author: memberToIgnore.user,
			});
			await upsertChannelSettings(textChannel, {
				flags: {
					indexingEnabled: true,
				},
			});
			await createDiscordAccount(toAODiscordAccount(memberToIgnore.user));
			const settings = await createUserServerSettings({
				userId: memberToIgnore.user.id,
				serverId: memberToIgnore.guild.id,
				flags: {
					messageIndexingDisabled: true,
				},
			});
			expect(settings.flags.messageIndexingDisabled).toBe(true);
			const filteredMessages = await filterMessages(
				[messageToIgnore],
				textChannel,
			);
			expect(filteredMessages.length).toBe(0);
		});
		it('should not filter normal users', async () => {
			const msg1 = mockMessage({ client, channel: textChannel });
			const msg2 = mockMessage({ client, channel: textChannel });
			const filteredMessages = await filterMessages([msg1, msg2], textChannel);
			expect(filteredMessages.length).toBe(2);
		});
	});
	describe('Fetch All Messages', () => {
		const numberOfMessages = 1425;
		beforeEach(() => {
			for (let id = 1; id <= numberOfMessages; id++) {
				mockMessage({
					client,
					channel: textChannel,
					override: {
						id: `${id}`,
					},
				});
			}
		});
		it('should fetch all messages', async () => {
			const messages = await fetchAllMessages(textChannel, {
				limit: 20000,
			});
			expect(messages.length).toBe(numberOfMessages);
		});
		it('should fetch all messages with a limit', async () => {
			const limit = 36;
			const messages = await fetchAllMessages(textChannel, { limit });
			expect(messages.length).toBe(limit);
		});
		it('should fetch all messages with a limit and a start', async () => {
			const limit = 36;
			const start = 100;
			const messages = await fetchAllMessages(textChannel, {
				limit,
				start: `${start}`,
			});
			expect(messages.length).toBe(limit);
			expect(messages[0]!.id).toBe(`${start + 1}`);
		});
		it('should return the messages sorted from oldest to newest', async () => {
			const messages = await fetchAllMessages(textChannel, {
				limit: 20000,
			});
			expect(messages.length).toBe(numberOfMessages);
			for (let id = 0; id < numberOfMessages; id++) {
				expect(messages[id]!.id).toBe(`${id + 1}`);
			}
		});
	});
});
