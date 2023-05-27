import {
	type DiscordAccount,
	type Message,
	type Server,
	createServer,
	createChannel,
	createDiscordAccount,
	upsertManyMessages,
	createUserServerSettings,
	type ChannelWithFlags,
} from '@answeroverflow/db';
import {
	mockAccountWithServersCallerCtx,
	mockUnauthedCtx,
} from '~api/test/utils';
import { messagesRouter } from './messages';
import {
	pickPublicChannelData,
	pickPublicServerData,
	toMessageWithAccountAndRepliesTo,
	toPrivateMessageWithStrippedData,
} from '~api/test/public-data';
import {
	mockServer,
	mockDiscordAccount,
	mockMessage,
	mockThread,
	mockChannelWithFlags,
} from '@answeroverflow/db-mock';
import { getRandomId } from '@answeroverflow/utils';
import { randomSnowflakeLargerThan } from '@answeroverflow/discordjs-utils';
import { ChannelType } from 'discord-api-types/v10';
import { NUMBER_OF_CHANNEL_MESSAGES_TO_LOAD } from '@answeroverflow/constants';

let server: Server;
let channel: ChannelWithFlags;
let author: DiscordAccount;
let unauthedMessagePageRouter: ReturnType<
	(typeof messagesRouter)['createCaller']
>;
let sameServerMessagePageRouter: ReturnType<
	(typeof messagesRouter)['createCaller']
>;
beforeEach(async () => {
	server = mockServer();

	author = mockDiscordAccount();

	await createServer(server);
	channel = await createChannel(
		mockChannelWithFlags(server, {
			flags: {
				indexingEnabled: true,
			},
		}),
	);
	await createDiscordAccount(author);
	const unauthedCtx = await mockUnauthedCtx('web-client');
	unauthedMessagePageRouter = messagesRouter.createCaller(unauthedCtx);
	const sameServerCtx = await mockAccountWithServersCallerCtx(
		server,
		'web-client',
		'AddReactions',
		author,
	);
	sameServerMessagePageRouter = messagesRouter.createCaller(sameServerCtx.ctx);
});

describe('Message Results', () => {
	it("should 404 if the root message doesn't exists", async () => {
		await expect(
			unauthedMessagePageRouter.threadFromMessageId(getRandomId()),
		).rejects.toThrow('Target message not found');
	});
	describe('Text Channel Message Pages', () => {
		let message: Message;
		let message2: Message;
		beforeEach(async () => {
			message = mockMessage(server, channel, author);
			message2 = mockMessage(server, channel, author, {
				id: randomSnowflakeLargerThan(message.id).toString(),
			});
			await upsertManyMessages([message, message2]);
		});
		it('should get messages for a text channel correctly', async () => {
			const messages = await unauthedMessagePageRouter.threadFromMessageId(
				message.id,
			);

			expect(messages.messages).toEqual([
				toPrivateMessageWithStrippedData(
					toMessageWithAccountAndRepliesTo({
						message,
						author,
						publicMessage: false,
					}),
				),
				toPrivateMessageWithStrippedData(
					toMessageWithAccountAndRepliesTo({
						message: message2,
						author,
						publicMessage: false,
					}),
				),
			]);

			expect(messages.parentChannel).toEqual(
				pickPublicChannelData(mockChannelWithFlags(server, channel)),
			);
			expect(messages.server).toEqual(pickPublicServerData(server));
			expect(messages.thread).toEqual(undefined);
		});
	});
	describe('Thread Message Pages', () => {
		it('should get messages correctly starting from the root of a text channel thread', async () => {
			const thread = mockThread(channel);
			const message = mockMessage(server, channel, author, {
				childThreadId: thread.id,
				id: thread.id,
			});
			const message2 = mockMessage(server, thread, author, {
				id: randomSnowflakeLargerThan(message.id).toString(),
			});
			await createChannel(thread);
			await upsertManyMessages([message, message2]);
			const pageData = await unauthedMessagePageRouter.threadFromMessageId(
				message.id,
			);

			expect(pageData.messages).toEqual([
				toPrivateMessageWithStrippedData(
					toMessageWithAccountAndRepliesTo({
						message,
						author,
						publicMessage: false,
					}),
				),
				toPrivateMessageWithStrippedData(
					toMessageWithAccountAndRepliesTo({
						message: message2,
						author,
						publicMessage: false,
					}),
				),
			]);
			expect(pageData.parentChannel).toEqual(
				pickPublicChannelData(mockChannelWithFlags(server, channel)),
			);
			expect(pageData.server).toEqual(pickPublicServerData(server));
			expect(pageData.thread).toEqual(
				pickPublicChannelData(mockChannelWithFlags(server, thread)),
			);
		});
		it('should get messages correctly starting a non root message in a text channel thread', async () => {
			const thread = await createChannel(mockThread(channel));
			const message = mockMessage(server, channel, author, {
				childThreadId: thread.id,
				id: thread.id,
			});
			const message2 = mockMessage(server, thread, author, {
				id: randomSnowflakeLargerThan(message.id).toString(),
				parentChannelId: channel.id,
			});
			await upsertManyMessages([message, message2]);
			const pageData = await unauthedMessagePageRouter.threadFromMessageId(
				message2.id,
			);
			expect(pageData.messages).toEqual([
				toPrivateMessageWithStrippedData(
					toMessageWithAccountAndRepliesTo({
						message: message,
						author,
						publicMessage: false,
					}),
				),
				toPrivateMessageWithStrippedData(
					toMessageWithAccountAndRepliesTo({
						message: message2,
						author,
						publicMessage: false,
					}),
				),
			]);
			expect(pageData.parentChannel).toEqual(pickPublicChannelData(channel));
			expect(pageData.server).toEqual(pickPublicServerData(server));
			expect(pageData.thread).toEqual(pickPublicChannelData(thread));
		});
		it('should get follow up messages of a text channel correctly', async () => {
			const message = mockMessage(server, channel, author);
			const message2 = mockMessage(server, channel, author, {
				id: randomSnowflakeLargerThan(message.id).toString(),
			});
			await upsertManyMessages([message, message2]);
			const pageData = await unauthedMessagePageRouter.threadFromMessageId(
				message.id,
			);
			expect(pageData.messages).toEqual([
				toPrivateMessageWithStrippedData(
					toMessageWithAccountAndRepliesTo({
						message,
						author,
						publicMessage: false,
					}),
				),
				toPrivateMessageWithStrippedData(
					toMessageWithAccountAndRepliesTo({
						message: message2,
						author,
						publicMessage: false,
					}),
				),
			]);
			expect(pageData.parentChannel).toEqual(pickPublicChannelData(channel));
			expect(pageData.server).toEqual(pickPublicServerData(server));
			expect(pageData.thread).toEqual(undefined);
		});
		it('should get follow up messages of a forum post correctly starting from the root of the post', async () => {
			const forumChannel = await createChannel(
				mockChannelWithFlags(server, {
					type: ChannelType.GuildForum,
					flags: {
						indexingEnabled: true,
					},
				}),
			);
			const forumThread = await createChannel(mockThread(forumChannel));
			const message = mockMessage(server, forumThread, author, {
				id: forumChannel.id,
				parentChannelId: forumChannel.id,
			});
			const message2 = mockMessage(server, forumThread, author, {
				id: randomSnowflakeLargerThan(message.id).toString(),
				parentChannelId: forumChannel.id,
			});
			await upsertManyMessages([message, message2]);
			const pageData = await unauthedMessagePageRouter.threadFromMessageId(
				message.id,
			);
			expect(pageData.messages).toEqual([
				toPrivateMessageWithStrippedData(
					toMessageWithAccountAndRepliesTo({
						message,
						author,
						publicMessage: false,
					}),
				),
				toPrivateMessageWithStrippedData(
					toMessageWithAccountAndRepliesTo({
						message: message2,
						author,
						publicMessage: false,
					}),
				),
			]);
			expect(pageData.parentChannel).toEqual(
				pickPublicChannelData(forumChannel),
			);
			expect(pageData.server).toEqual(pickPublicServerData(server));
			expect(pageData.thread).toEqual(pickPublicChannelData(forumThread));
		});
		it('should get follow up messages of a forum post correctly starting from a non root message', async () => {
			const forumChannel = await createChannel(
				mockChannelWithFlags(server, {
					type: ChannelType.GuildForum,
					flags: {
						indexingEnabled: true,
					},
				}),
			);
			const forumThread = await createChannel(mockThread(forumChannel));
			const message = mockMessage(server, forumThread, author, {
				id: forumChannel.id,
				parentChannelId: forumChannel.id,
			});
			const message2 = mockMessage(server, forumThread, author, {
				id: randomSnowflakeLargerThan(message.id).toString(),
				parentChannelId: forumChannel.id,
			});
			await upsertManyMessages([message, message2]);
			const pageData = await unauthedMessagePageRouter.threadFromMessageId(
				message2.id,
			);
			expect(pageData.messages).toEqual([
				toPrivateMessageWithStrippedData(
					toMessageWithAccountAndRepliesTo({
						message,
						author,
						publicMessage: false,
					}),
				),
				toPrivateMessageWithStrippedData(
					toMessageWithAccountAndRepliesTo({
						message: message2,
						author,
						publicMessage: false,
					}),
				),
			]);
			expect(pageData.parentChannel).toEqual(
				pickPublicChannelData(forumChannel),
			);
			expect(pageData.server).toEqual(pickPublicServerData(server));
			expect(pageData.thread).toEqual(pickPublicChannelData(forumThread));
		});
	});
});

describe('Search Results', () => {
	it('should fetch a public search result correctly', async () => {
		await createUserServerSettings({
			userId: author.id,
			serverId: server.id,
			flags: {
				canPubliclyDisplayMessages: true,
			},
		});
		const message = mockMessage(server, channel, author, {
			content: getRandomId(),
		});
		await upsertManyMessages([message]);
		const searchResults = await unauthedMessagePageRouter.search({
			query: message.content,
		});
		const firstResult = searchResults[0]!;
		expect(firstResult).toBeDefined();
		expect(firstResult.message).toEqual(
			toMessageWithAccountAndRepliesTo({
				message,
				author,
				publicMessage: true,
			}),
		);
	});
	it('should not return a private search result if the user is not logged in', async () => {
		const message = mockMessage(server, channel, author, {
			content: getRandomId(),
		});
		await upsertManyMessages([message]);
		const searchResults = await unauthedMessagePageRouter.search({
			query: message.content,
		});
		expect(searchResults).toEqual([]);
	});
	it('should return a private search result if the user is logged in', async () => {
		const message = mockMessage(server, channel, author, {
			content: getRandomId(),
		});
		await upsertManyMessages([message]);
		const searchResults = await sameServerMessagePageRouter.search({
			query: message.content,
		});
		const firstResult = searchResults[0]!;
		expect(firstResult).toBeDefined();
		expect(firstResult.message).toEqual(
			toMessageWithAccountAndRepliesTo({
				message,
				author,
				publicMessage: false,
			}),
		);
		expect(firstResult.server).toEqual(pickPublicServerData(server));
		expect(firstResult.channel).toEqual({
			...pickPublicChannelData(channel),
			messageCount: NUMBER_OF_CHANNEL_MESSAGES_TO_LOAD,
		});
		expect(firstResult.thread).toEqual(undefined);
	});
	it('should fetch a result in a server correctly', async () => {
		const message = mockMessage(server, channel, author, {
			content: getRandomId(),
		});
		const otherServer = mockServer();
		const otherChannel = mockChannelWithFlags(otherServer, {
			flags: {
				indexingEnabled: true,
			},
		});
		await createServer(otherServer);
		await createChannel(otherChannel);
		const otherMessage = mockMessage(otherServer, otherChannel, author, {
			content: message.content,
		});
		await upsertManyMessages([message, otherMessage]);
		await createUserServerSettings({
			userId: author.id,
			serverId: server.id,
			flags: {
				canPubliclyDisplayMessages: true,
			},
		});
		await createUserServerSettings({
			userId: author.id,
			serverId: otherServer.id,
			flags: {
				canPubliclyDisplayMessages: true,
			},
		});
		const searchResults = await unauthedMessagePageRouter.search({
			query: message.content,
			serverId: server.id,
		});
		expect(searchResults).toHaveLength(1);
		const firstResult = searchResults[0]!;
		expect(firstResult).toBeDefined();
		expect(firstResult.message).toEqual(
			toMessageWithAccountAndRepliesTo({
				message,
				author,
				publicMessage: true,
			}),
		);
	});
	it('should fetch a result in a channel correctly', async () => {
		const message = mockMessage(server, channel, author, {
			content: getRandomId(),
		});
		const otherServer = mockServer();
		const otherChannel = mockChannelWithFlags(otherServer, {
			flags: {
				indexingEnabled: true,
			},
		});
		await createServer(otherServer);
		await createChannel(otherChannel);
		const otherMessage = mockMessage(otherServer, otherChannel, author, {
			content: message.content,
		});
		await upsertManyMessages([message, otherMessage]);
		await createUserServerSettings({
			userId: author.id,
			serverId: server.id,
			flags: {
				canPubliclyDisplayMessages: true,
			},
		});
		await createUserServerSettings({
			userId: author.id,
			serverId: otherServer.id,
			flags: {
				canPubliclyDisplayMessages: true,
			},
		});
		const searchResults = await unauthedMessagePageRouter.search({
			query: message.content,
			channelId: channel.id,
		});
		expect(searchResults).toHaveLength(1);
		const firstResult = searchResults[0]!;
		expect(firstResult).toBeDefined();
		expect(firstResult.message).toEqual(
			toMessageWithAccountAndRepliesTo({
				message,
				author,
				publicMessage: true,
			}),
		);
	});
});
