import {
	mockChannelWithFlags,
	mockDiscordAccount,
	mockMessage,
	mockServer,
} from '@answeroverflow/db-mock';
import {
	bulkFindLatestMessageInChannel,
	CANNOT_UPSERT_MESSAGE_FOR_IGNORED_ACCOUNT_MESSAGE,
	CANNOT_UPSERT_MESSAGE_FOR_USER_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE,
	deleteManyMessages,
	deleteManyMessagesByChannelId,
	deleteManyMessagesByUserId,
	deleteMessage,
	findFullMessageById,
	findLatestMessageIdInChannel,
	findManyMessagesWithAuthors,
	findMessageById,
	findMessagesByChannelIdWithDiscordAccounts,
	upsertMessage,
} from './message';
import { createServer } from './server';
import { createChannel } from './channel';
import { createDiscordAccount, deleteDiscordAccount } from './discord-account';
import { createUserServerSettings } from './user-server-settings';
import { getRandomId, getRandomIdGreaterThan } from '@answeroverflow/utils';
import { BaseMessageWithRelations, DiscordAccount, Server } from './schema';
import { ChannelWithFlags } from './zodSchemas/channelSchemas';

describe('Message Ops', () => {
	let server: Server;
	let channel: ChannelWithFlags;
	let msg: BaseMessageWithRelations;
	let author: DiscordAccount;
	beforeEach(async () => {
		server = mockServer();
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
			test('with reaction create', async () => {
				const eId = getRandomId();
				const mId = getRandomId();
				const msgWithReaction = mockMessage(server, channel, author, {
					id: mId,
					reactions: [
						{
							messageId: mId,
							userId: author.id,
							emoji: {
								id: eId,
								name: '👍',
							},
							emojiId: eId,
						},
					],
				});
				const reaction = msgWithReaction.reactions![0]!;
				await upsertMessage(msgWithReaction);
				const found = await findFullMessageById(msgWithReaction.id);
				expect(found?.reactions).toHaveLength(1);
				expect(found?.reactions[0]!.emojiId).toBe(reaction.emojiId);
			});
			test('with reaction update', async () => {
				const eId = getRandomId();
				const mId = getRandomId();
				const msgWithReaction = mockMessage(server, channel, author, {
					id: mId,
					reactions: [
						{
							messageId: mId,
							userId: author.id,
							emoji: {
								id: eId,
								name: '👍',
							},
							emojiId: eId,
						},
					],
				});
				await upsertMessage(msgWithReaction);
				await upsertMessage({
					...msgWithReaction,
					reactions: [],
				});
				const found = await findFullMessageById(msgWithReaction.id);
				expect(found?.reactions).toHaveLength(0);
			});
		});
		describe('with attachments', () => {
			test('with attachment create', async () => {
				const msgWithAttachment = mockMessage(server, channel, author, {
					id: msg.id,
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
				await upsertMessage(msgWithAttachment);
				const found = await findFullMessageById(msgWithAttachment.id);
				expect(found?.attachments).toHaveLength(1);
				expect(found?.attachments[0]!).toStrictEqual(attachment);
			});
			test('with attachment update', async () => {
				const msgWithAttachment = mockMessage(server, channel, author, {
					id: msg.id,
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
				await upsertMessage(msgWithAttachment);
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
				const found = await findFullMessageById(msgWithAttachment.id);
				expect(found?.attachments).toHaveLength(1);
				expect(found?.attachments[0]!.description).toBe('updated');
			});
		});
		describe('with embeds', () => {
			test('with embed create', async () => {
				const msgWithEmbed = mockMessage(server, channel, author, {
					embeds: [
						{
							author: {
								name: 'test',
								url: 'https://example.com',
								iconUrl: 'https://example.com/test.png',
								proxyIconUrl: 'https://example.com/test.png',
							},
						},
					],
				});
				await upsertMessage(msgWithEmbed);
				const found = await findFullMessageById(msgWithEmbed.id);
				expect(found?.embeds).toHaveLength(1);
				expect(found?.embeds![0]!.author?.name).toBe('test');
			});
			test('with embed update', async () => {
				const msgWithEmbed = mockMessage(server, channel, author, {
					embeds: [
						{
							author: {
								name: 'test',
								url: 'https://example.com',
								iconUrl: 'https://example.com/test.png',
								proxyIconUrl: 'https://example.com/test.png',
							},
						},
					],
				});
				await upsertMessage(msgWithEmbed);
				await upsertMessage({
					...msgWithEmbed,
					embeds: [],
				});
				const found = await findFullMessageById(msgWithEmbed.id);
				expect(found?.embeds).toHaveLength(0);
			});
		});
		test('with reference', async () => {
			const original = mockMessage(server, channel, author);
			const reply = mockMessage(server, channel, author, {
				referenceId: original.id,
			});
			await upsertMessage(original);
			await upsertMessage(reply);
			const found = await findFullMessageById(reply.id);
			expect(found?.reference).not.toBeNull();
		});
		test('with solution', async () => {
			const question = mockMessage(server, channel, author);
			const solution = mockMessage(server, channel, author, {
				questionId: question.id,
			});
			await upsertMessage(question);
			await upsertMessage(solution);
			const questionWithSolution = await findFullMessageById(question.id);

			expect(questionWithSolution?.solutions).toHaveLength(1);
		});
	});
	describe('Find By Id', () => {
		it('should return a message', async () => {
			await upsertMessage(msg);
			const found = await findMessageById(msg.id);
			expect(found?.id).toBe(msg.id);
		});
		it('should return null if message not found', async () => {
			const found = await findMessageById(getRandomId());
			expect(found).toBeUndefined();
		});
	});
	describe('Find Many Messages With Authors', () => {
		test('empty array', async () => {
			const found = await findManyMessagesWithAuthors([]);
			expect(found).toHaveLength(0);
		});
	});
	describe('Delete Messages', () => {
		it('should delete a message', async () => {
			await upsertMessage(msg);
			const found = await findMessageById(msg.id);
			expect(found).toBeDefined();
			expect(found?.id).toBe(msg.id);
			await deleteMessage(msg.id);
			const foundDeleted = await findMessageById(msg.id);
			expect(foundDeleted).not.toBeDefined();
		});
		it('should fail to delete a message that does not exist returning null', async () => {
			await deleteMessage(msg.id);
			const foundDeleted = await findMessageById(msg.id);
			expect(foundDeleted).not.toBeDefined();
		});
	});
	describe('Find By Channel Id', () => {
		beforeEach(async () => {
			const msg2 = mockMessage(server, channel, author);
			const msg3 = mockMessage(server, channel, author);
			await upsertMessage(msg);
			await upsertMessage(msg2);
			await upsertMessage(msg3);
		});
		it('should return messages', async () => {
			const found = await findMessagesByChannelIdWithDiscordAccounts({
				channelId: channel.id,
			});
			expect(found).toHaveLength(3);
		});
		it('should find a limited number of messages', async () => {
			const found = await findMessagesByChannelIdWithDiscordAccounts({
				channelId: channel.id,
				limit: 2,
			});
			expect(found).toHaveLength(2);
		});
		test.todo('should find messages after a given message id');
	});
	describe('Delete Many Messages By Id', () => {
		it('should delete many messages', async () => {
			const msg2 = mockMessage(server, channel, author);
			const msg3 = mockMessage(server, channel, author);
			await upsertMessage(msg);
			await upsertMessage(msg2);
			await upsertMessage(msg3);
			const found = await findMessagesByChannelIdWithDiscordAccounts({
				channelId: channel.id,
			});
			expect(found).toHaveLength(3);
			await deleteManyMessages([msg.id, msg2.id, msg3.id]);

			const foundDeleted = await findMessagesByChannelIdWithDiscordAccounts({
				channelId: channel.id,
			});
			expect(foundDeleted).toHaveLength(0);
		});
	});
	describe('Delete Many Messages By Channel Id', () => {
		it('should delete many messages', async () => {
			const msg2 = mockMessage(server, channel, author);
			const msg3 = mockMessage(server, channel, author);
			await upsertMessage(msg);
			await upsertMessage(msg2);
			await upsertMessage(msg3);
			const found = await findMessagesByChannelIdWithDiscordAccounts({
				channelId: channel.id,
			});
			expect(found).toHaveLength(3);
			await deleteManyMessagesByChannelId(channel.id);

			const foundDeleted = await findMessagesByChannelIdWithDiscordAccounts({
				channelId: channel.id,
			});
			expect(foundDeleted).toHaveLength(0);
		});
	});
	describe('Delete Many Messages By User Id', () => {
		it('should delete many messages', async () => {
			const msg2 = mockMessage(server, channel, author);
			const msg3 = mockMessage(server, channel, author);
			await upsertMessage(msg);
			await upsertMessage(msg2);
			await upsertMessage(msg3);
			const found = await findMessagesByChannelIdWithDiscordAccounts({
				channelId: channel.id,
			});
			expect(found).toHaveLength(3);
			await deleteManyMessagesByUserId(author.id);
			const foundDeleted = await findMessagesByChannelIdWithDiscordAccounts({
				channelId: channel.id,
			});
			expect(foundDeleted).toHaveLength(0);
		});
	});
	describe('Bulk Find Latest Messages in Channel', () => {
		it('should find the latest messages in a channel', async () => {
			const chnl2 = mockChannelWithFlags(server, {
				lastIndexedSnowflake: '340',
			});
			const chnl3 = mockChannelWithFlags(server, {
				lastIndexedSnowflake: '521',
			});
			await createChannel(chnl2);
			await createChannel(chnl3);
			const found = await bulkFindLatestMessageInChannel([
				channel.id,
				chnl2.id,
				chnl3.id,
			]);
			expect(found).toHaveLength(3);
			const map = new Map(found.map((m) => [m.channelId, m.latestMessageId]));
			expect(map.get(channel.id)).toBe(null);
			expect(map.get(chnl2.id)).toBe('340');
			expect(map.get(chnl3.id)).toBe('521');
		});
	});
	describe('Find Latest Message in Channel', () => {
		test('should find the latest message in a channel', async () => {
			const largerThanMsg = mockMessage(server, channel, author, {
				id: getRandomIdGreaterThan(Number(msg.id)),
			});
			const largerThanMsg2 = mockMessage(server, channel, author, {
				id: getRandomIdGreaterThan(Number(largerThanMsg.id)),
			});
			await upsertMessage(largerThanMsg);
			await upsertMessage(largerThanMsg2);
			await upsertMessage(msg);
			const found = await findLatestMessageIdInChannel(channel.id);
			expect(found).toBe(largerThanMsg2.id);
		});
	});
});
