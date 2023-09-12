import {
	mockChannelWithFlags,
	mockDiscordAccount,
	mockMessage,
	mockServer,
	mockThread,
} from '@answeroverflow/db-mock';
import {
	addAuthorToMessage,
	addReferenceToMessage,
	CANNOT_UPSERT_MESSAGE_FOR_IGNORED_ACCOUNT_MESSAGE,
	CANNOT_UPSERT_MESSAGE_FOR_USER_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE,
	deleteManyMessages,
	deleteManyMessagesByChannelId,
	deleteManyMessagesByUserId,
	deleteMessage,
	findFullMessageById,
	findManyMessagesWithAuthors,
	findMessageById,
	findMessagesByChannelId,
	searchMessages,
	updateMessage,
	upsertManyMessages,
	upsertMessage,
} from './message';
import { createServer } from './server';
import { createChannel } from './channel';
import { createDiscordAccount, deleteDiscordAccount } from './discord-account';
import { createUserServerSettings } from './user-server-settings';
import { getRandomId } from '@answeroverflow/utils';
import { BaseMessageWithRelations, DiscordAccount, Server } from './schema';
import { ServerWithFlags } from './zodSchemas/serverSchemas';
import { ChannelWithFlags } from './zodSchemas/channelSchemas';
import { addFlagsToServer } from './utils/serverUtils';

describe('Message Operations', () => {
	let server: Server;
	let serverWithFlags: ServerWithFlags;
	let channel: ChannelWithFlags;
	let message: Message;
	let author: DiscordAccount;
	beforeEach(async () => {
		server = mockServer();
		serverWithFlags = addFlagsToServer(server);
		channel = mockChannelWithFlags(server, {
			flags: {
				indexingEnabled: true,
			},
		});
		author = mockDiscordAccount();
		message = mockMessage(server, channel, author);
		await createServer(server);
		await createChannel(channel);
		await createDiscordAccount(author);
	});
	describe('Find By Id', () => {
		it('should return a message', async () => {
			await upsertMessage(message);
			const found = await findMessageById(message.id);
			expect(found?.id).toBe(message.id);
		});
		it('should return null if message not found', async () => {
			const found = await findMessageById('1');
			expect(found).toBeNull();
		});
	});
	describe('Find By Channel Id', () => {
		beforeEach(async () => {
			const msg2 = mockMessage(server, channel, author);
			const msg3 = mockMessage(server, channel, author);
			await upsertMessage(message);
			await upsertMessage(msg2);
			await upsertMessage(msg3);
		});
		it('should return messages', async () => {
			const found = await findMessagesByChannelId({
				channelId: channel.id,
			});
			expect(found).toHaveLength(3);
		});
		it('should find a limited number of messages', async () => {
			const found = await findMessagesByChannelId({
				channelId: channel.id,
				limit: 2,
			});
			expect(found).toHaveLength(2);
		});
		test.todo('should find messages after a given message id');
	});
	describe('Update', () => {
		it('should update a message', async () => {
			await upsertMessage(message);
			const found = await findMessageById(message.id);
			expect(found).not.toBeNull();
			expect(found?.id).toBe(message.id);
			expect(found?.content).toBe(message.content);
			const updated = { ...message, content: 'updated' };
			await upsertMessage(updated);
			const foundUpdated = await findMessageById(message.id);
			expect(foundUpdated).not.toBeNull();
			expect(foundUpdated?.id).toBe(message.id);
			expect(foundUpdated?.content).toBe(updated.content);
		});
		it('should fail to update a message that does not exist returning null', async () => {
			await expect(updateMessage(message)).resolves.toBeNull();
		});
	});
	describe('Upsert Many Messages', () => {
		it('should upsert many messages', async () => {
			const msg2 = mockMessage(server, channel, author);
			const msg3 = mockMessage(server, channel, author);
			await upsertManyMessages([message, msg2, msg3]);
			const found = await findMessagesByChannelId({
				channelId: channel.id,
			});
			expect(found).toHaveLength(3);
		});
		it('should only upsert messages for non-ignored accounts', async () => {
			const msg2 = mockMessage(server, channel, author);
			const author2 = mockDiscordAccount();
			await createDiscordAccount(author2);
			const msg3 = mockMessage(server, channel, author2);
			await deleteDiscordAccount(author.id);
			await upsertManyMessages([message, msg2, msg3]);
			const found = await findMessagesByChannelId({
				channelId: channel.id,
			});
			expect(found).toHaveLength(1);
		});
		it('should return 0 if no messages are upserted', async () => {
			await expect(upsertManyMessages([])).resolves.toBe(true);
		});
		it('should only upsert messages for users with message indexing enabled', async () => {
			const msg2 = mockMessage(server, channel, author);
			const author2 = mockDiscordAccount();
			await createDiscordAccount(author2);
			const msg3 = mockMessage(server, channel, author2);
			await createUserServerSettings({
				userId: author.id,
				serverId: server.id,
				flags: {
					messageIndexingDisabled: true,
				},
			});
			await upsertManyMessages([message, msg2, msg3]);
			const found = await findMessagesByChannelId({
				channelId: channel.id,
			});
			expect(found).toHaveLength(1);
		});
	});
	describe('Delete Messages', () => {
		it('should delete a message', async () => {
			await upsertMessage(message);
			const found = await findMessageById(message.id);
			expect(found).not.toBeNull();
			expect(found?.id).toBe(message.id);
			const deleteResult = await deleteMessage(message.id);
			expect(deleteResult).toBe(true);
			const foundDeleted = await findMessageById(message.id);
			expect(foundDeleted).toBeNull();
		});
		it('should fail to delete a message that does not exist returning null', async () => {
			await expect(deleteMessage(message.id)).resolves.toBeFalsy();
		});
	});
	describe('Delete Many Messages By Id', () => {
		it('should delete many messages', async () => {
			const msg2 = mockMessage(server, channel, author);
			const msg3 = mockMessage(server, channel, author);
			await upsertMessage(message);
			await upsertMessage(msg2);
			await upsertMessage(msg3);
			const found = await findMessagesByChannelId({
				channelId: channel.id,
			});
			expect(found).toHaveLength(3);
			const deleteResult = await deleteManyMessages([
				message.id,
				msg2.id,
				msg3.id,
			]);
			expect(deleteResult).toBe(true);
			const foundDeleted = await findMessagesByChannelId({
				channelId: channel.id,
			});
			expect(foundDeleted).toHaveLength(0);
		});
	});
	describe('Delete Many Messages By Channel Id', () => {
		it('should delete many messages', async () => {
			const msg2 = mockMessage(server, channel, author);
			const msg3 = mockMessage(server, channel, author);
			await upsertMessage(message);
			await upsertMessage(msg2);
			await upsertMessage(msg3);
			const found = await findMessagesByChannelId({
				channelId: channel.id,
			});
			expect(found).toHaveLength(3);
			const deleteResult = await deleteManyMessagesByChannelId(channel.id);
			expect(deleteResult).toBe(3);
			const foundDeleted = await findMessagesByChannelId({
				channelId: channel.id,
			});
			expect(foundDeleted).toHaveLength(0);
		});
	});
	describe('Delete Many Messages By User Id', () => {
		it('should delete many messages', async () => {
			const msg2 = mockMessage(server, channel, author);
			const msg3 = mockMessage(server, channel, author);
			await upsertMessage(message);
			await upsertMessage(msg2);
			await upsertMessage(msg3);
			const found = await findMessagesByChannelId({
				channelId: channel.id,
			});
			expect(found).toHaveLength(3);
			const deleteResult = await deleteManyMessagesByUserId(author.id);
			expect(deleteResult).toBe(3);
			const foundDeleted = await findMessagesByChannelId({
				channelId: channel.id,
			});
			expect(foundDeleted).toHaveLength(0);
		});
	});
	describe('Add Reference To Message', () => {
		it('should return null if the referenced message isnt found', async () => {
			const msg = mockMessage(server, channel, author);
			const created = await upsertMessage(msg);
			const withRef = await addReferenceToMessage(created);
			expect(withRef?.referencedMessage).toBeNull();
		});
		it('should add the reference to the message', async () => {
			const ref = mockMessage(server, channel, author);
			const msg = mockMessage(server, channel, author, {
				messageReference: {
					messageId: ref.id,
					channelId: ref.channelId,
					serverId: ref.serverId,
				},
			});
			await upsertMessage(ref);
			const created = await upsertMessage(msg);
			const withRef = await addReferenceToMessage(created);
			expect(withRef).not.toBeNull();
			expect(withRef?.referencedMessage).not.toBeNull();
			expect(withRef?.referencedMessage?.id).toBe(ref.id);
		});
		it('should add the solution to the message', async () => {
			const solution = mockMessage(server, channel, author);
			const msg = mockMessage(server, channel, author, {
				solutionIds: [solution.id],
			});
			const created = await upsertMessage(msg);
			await upsertMessage(solution);
			const withRef = await addReferenceToMessage(created);
			expect(withRef).not.toBeNull();
			expect(withRef?.solutionMessages).toHaveLength(1);
			expect(withRef?.solutionMessages[0]!.id).toBe(solution.id);
		});
		it('should have a empty solution if the solution message is not found', async () => {
			const msg = mockMessage(server, channel, author, {
				solutionIds: ['123'],
			});
			const created = await upsertMessage(msg);
			const withRef = await addReferenceToMessage(created);
			expect(withRef).not.toBeNull();
			expect(withRef?.solutionMessages).toHaveLength(0);
		});
	});
	describe('Add Authors To Message', () => {
		it('should return null if the author isnt found', async () => {
			const msg = mockMessage(server, channel, author);
			const created = await upsertMessage(msg);
			const withRef = await addReferenceToMessage(created);
			await deleteDiscordAccount(author.id);
			const withAuthor = await addAuthorToMessage(withRef!, serverWithFlags);
			expect(withAuthor).toBeNull();
		});
		it('should add the author to the message', async () => {
			const msg = mockMessage(server, channel, author);
			const created = await upsertMessage(msg);
			const withRef = await addReferenceToMessage(created);
			const withAuthor = await addAuthorToMessage(withRef!, serverWithFlags);
			expect(withAuthor?.author).not.toBeNull();
			expect(withAuthor?.author?.id).toBe(author.id);
		});
		it('should add the author to the referenced message', async () => {
			const reply = mockMessage(server, channel, author);
			const msg = mockMessage(server, channel, author, {
				messageReference: {
					messageId: reply.id,
					channelId: reply.channelId,
					serverId: reply.serverId,
				},
			});
			await upsertMessage(reply);
			const created = await upsertMessage(msg);
			const withRef = await addReferenceToMessage(created);
			const withAuthor = await addAuthorToMessage(withRef!, serverWithFlags);
			expect(withAuthor?.referencedMessage?.author).not.toBeNull();
			expect(withAuthor?.referencedMessage?.author?.id).toBe(author.id);
		});
		it('should have a null referenced message if the author is not found', async () => {
			const reply = mockMessage(server, channel, mockDiscordAccount());
			const msg = mockMessage(server, channel, author, {
				messageReference: {
					messageId: reply.id,
					channelId: reply.channelId,
					serverId: reply.serverId,
				},
			});
			await upsertMessage(reply);
			const created = await upsertMessage(msg);
			const withRef = await addReferenceToMessage(created);
			const withAuthor = await addAuthorToMessage(withRef!, serverWithFlags);
			expect(withAuthor?.referencedMessage).toBeNull();
		});
		it('should add the author to the solution message', async () => {
			const solution = mockMessage(server, channel, author);
			const msg = mockMessage(server, channel, author, {
				solutionIds: [solution.id],
			});
			const created = await upsertMessage(msg);
			await upsertMessage(solution);
			const withRef = await addReferenceToMessage(created);
			const withAuthor = await addAuthorToMessage(withRef!, serverWithFlags);
			expect(withAuthor!.solutionMessages[0]!.author).not.toBeNull();
			expect(withAuthor!.solutionMessages[0]!.author?.id).toBe(author.id);
		});
		it('should have a null solution message if the author is not found', async () => {
			const solution = mockMessage(server, channel, mockDiscordAccount());
			const msg = mockMessage(server, channel, author, {
				solutionIds: [solution.id],
			});
			const created = await upsertMessage(msg);
			await upsertMessage(solution);
			const withRef = await addReferenceToMessage(created);
			const withAuthor = await addAuthorToMessage(withRef!, serverWithFlags);
			expect(withAuthor?.solutionMessages).toHaveLength(0);
		});
		it('should mark a message as public if the server has require consent disabled', async () => {
			const msg = mockMessage(server, channel, author);
			const created = await upsertMessage(msg);
			const withRef = await addReferenceToMessage(created);
			const withAuthor = await addAuthorToMessage(withRef!, serverWithFlags);
			expect(withAuthor!.public).toBe(false);
			const withAuthorAndPublic = await addAuthorToMessage(withRef!, {
				...serverWithFlags,
				flags: {
					...serverWithFlags.flags,
					considerAllMessagesPublic: true,
				},
			});
			expect(withAuthorAndPublic!.public).toBe(true);
		});
		it('should mark a message as public if the author has consented', async () => {
			const msg = mockMessage(server, channel, author);
			const created = await upsertMessage(msg);
			const withRef = await addReferenceToMessage(created);
			const withAuthor = await addAuthorToMessage(withRef!, serverWithFlags);
			expect(withAuthor!.public).toBe(false);
			await createUserServerSettings({
				userId: author.id,
				serverId: server.id,
				flags: {
					canPubliclyDisplayMessages: true,
				},
			});
			const withAuthorAndPublic = await addAuthorToMessage(
				withRef!,
				serverWithFlags,
			);
			expect(withAuthorAndPublic!.public).toBe(true);
		});
		it("shouldn't be public by default", async () => {
			const msg = mockMessage(server, channel, author);
			const created = await upsertMessage(msg);
			const withRef = await addReferenceToMessage(created);
			const withAuthor = await addAuthorToMessage(withRef!, serverWithFlags);
			expect(withAuthor!.public).toBe(false);
		});
		it('should anonymize the author if the server has anonymization enabled', async () => {
			const msg = mockMessage(server, channel, author);
			const created = await upsertMessage(msg);
			const withRef = await addReferenceToMessage(created);
			const withAuthor = await addAuthorToMessage(withRef!, serverWithFlags);
			expect(withAuthor!.author.name).toBe(author.name);
			const withAuthorAndAnonymized = await addAuthorToMessage(withRef!, {
				...serverWithFlags,
				flags: {
					...serverWithFlags.flags,
					anonymizeMessages: true,
				},
			});
			expect(withAuthorAndAnonymized!.author.name).not.toBe(author.name);
			expect(withAuthorAndAnonymized!.author.id).not.toBe(author.id);
		});
	});
	describe('Search', () => {
		it('should search for a message in a normal channel', async () => {
			const msg = mockMessage(server, channel, author, {
				content: getRandomId(),
			});
			await upsertMessage(msg);
			const found = await searchMessages({
				query: msg.content,
			});
			const firstResult = found[0];
			expect(found).toHaveLength(1);
			expect(firstResult?.message.id).toBe(msg.id);
			expect(firstResult?.channel.id).toBe(channel.id);
			expect(firstResult?.server.id).toBe(server.id);
			expect(firstResult?.score).toBeGreaterThan(0);
		});
		it('should add the number of messages in a thread to the result', async () => {
			const thread = await createChannel(mockThread(channel));

			const msg = mockMessage(server, thread, author, {
				content: getRandomId(),
				parentChannelId: thread.parentId,
			});
			await upsertMessage(msg);
			const found = await searchMessages({
				query: msg.content,
			});
			const firstResult = found[0];
			expect(firstResult?.thread?.messageCount).toBe(1);
		});
		it('should add the max number of fetched channel messages to the result', async () => {
			const msg = mockMessage(server, channel, author, {
				content: getRandomId(),
			});
			await upsertMessage(msg);
			const found = await searchMessages({
				query: msg.content,
			});
			const firstResult = found[0];
			expect(firstResult?.channel.messageCount).toBe(20);
		});
	});
});

describe('Message Ops', () => {
	let server: Server;
	let serverWithFlags: ServerWithFlags;
	let channel: ChannelWithFlags;
	let msg: BaseMessageWithRelations;
	let author: DiscordAccount;
	beforeEach(async () => {
		server = mockServer();
		serverWithFlags = addFlagsToServer(server);
		channel = mockChannelWithFlags(server, {
			flags: {
				indexingEnabled: true,
			},
		});
		author = mockDiscordAccount();
		msg = mockMessage(server, channel, author);
		await createServer(server);
		await createChannel(channel);
		await createDiscordAccount(author);
	});
	describe('Upsert Message', () => {
		it('should upsert create a message', async () => {
			await upsertMessage(msg);
			const found = await findMessageById(msg.id);
			expect(found).not.toBeNull();
			expect(found?.id).toBe(msg.id);
		});
		it('should upsert update a message', async () => {
			await upsertMessage(msg);
			const found = await findMessageById(msg.id);
			expect(found).not.toBeNull();
			expect(found?.id).toBe(msg.id);
			expect(found?.content).toBe(msg.content);
			const updated = { ...msg, content: 'updated' };
			await upsertMessage(updated);
			const foundUpdated = await findMessageById(msg.id);
			expect(foundUpdated).not.toBeNull();
			expect(foundUpdated?.id).toBe(msg.id);
			expect(foundUpdated?.content).toBe(updated.content);
		});
		it('should fail to upsert a message with an ignored account', async () => {
			await deleteDiscordAccount(author.id);
			const ignoredMessage = mockMessage(server, channel, author);
			await expect(upsertMessage(ignoredMessage)).rejects.toThrowError(
				CANNOT_UPSERT_MESSAGE_FOR_IGNORED_ACCOUNT_MESSAGE,
			);
		});
		it('should fail to upsert a message for a user with message indexing disabled', async () => {
			await createUserServerSettings({
				userId: author.id,
				serverId: server.id,
				flags: {
					messageIndexingDisabled: true,
				},
			});
			await expect(upsertMessage(msg)).rejects.toThrowError(
				CANNOT_UPSERT_MESSAGE_FOR_USER_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE,
			);
		});
		describe('reactions', () => {
			test('with reaction create', async () => {});
			test('with reaction update', async () => {});
		});
		test('with attachments', () => {
			test('with attachment create', async () => {
				const msgWithAttachment = mockMessage(server, channel, author, {
					attachments: [
						{
							id: getRandomId(),
							messageId: msg.id,
							contentType: 'image/png',
							description: 'test',
							filename: 'test.png',
							height: 100,
							url: 'https://example.com/test.png',
							proxyUrl: 'https://example.com/test.png',
							size: 100,
							width: 100,
						},
					],
				});
				const attachment = msgWithAttachment.attachments![0]!;
				await upsertMessage(msg);
				const found = await findFullMessageById(msg.id);
				expect(found?.attachments).toHaveLength(1);
				expect(found?.attachments[0]!.id).toBe(attachment);
			});
			test('with attachment update', async () => {
				const msgWithAttachment = mockMessage(server, channel, author, {
					attachments: [
						{
							id: getRandomId(),
							messageId: msg.id,
							contentType: 'image/png',
							description: 'test',
							filename: 'test.png',
							height: 100,
							url: 'https://example.com/test.png',
							proxyUrl: 'https://example.com/test.png',
							size: 100,
							width: 100,
						},
					],
				});
				const attachment = msgWithAttachment.attachments![0]!;
				await upsertMessage(msg);
				const updated = {
					...msgWithAttachment,
					attachments: [
						{
							...attachment,
							description: 'updated',
						},
					],
				};
				await upsertMessage(updated);
				const found = await findFullMessageById(msg.id);
				expect(found?.attachments).toHaveLength(1);
				expect(found?.attachments[0]!.description).toBe('updated');
			});
		});
		test('with embeds', async () => {});
		test('with reference', async () => {});
		test('with solution', async () => {});
	});
	describe('Find Many Messages With Authors', () => {
		test('empty array', async () => {
			const found = await findManyMessagesWithAuthors([]);
			expect(found).toHaveLength(0);
		});
	});
});
