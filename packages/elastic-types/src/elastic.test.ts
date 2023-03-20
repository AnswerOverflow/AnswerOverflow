import { getRandomId, getRandomIdGreaterThan } from '@answeroverflow/utils';
import { elastic, getDefaultMessage } from '../index';
import type { Message } from './message';

let msg1: Message;

let msg2: Message;

beforeEach(() => {
	msg1 = getDefaultMessage({
		id: getRandomId(),
		channelId: getRandomId(),
		authorId: getRandomId(),
		serverId: getRandomId(),
	});
	msg2 = getDefaultMessage({
		id: getRandomId(),
		channelId: getRandomId(),
		authorId: getRandomId(),
		serverId: getRandomId(),
	});
});

describe('ElasticSearch', () => {
	describe('Message Create', () => {
		it('should index a message', async () => {
			const indexedMessage = await elastic.upsertMessage(msg1);
			expect(indexedMessage).toBeDefined();
		});
	});
	describe('Message Create Bulk', () => {
		it('should bulk index messages', async () => {
			const bulkSuccess = await elastic.bulkUpsertMessages([msg1, msg2]);
			expect(bulkSuccess).toBeTruthy();
			const fetchedMsg1 = await elastic.getMessage(msg1.id);
			expect(fetchedMsg1).toStrictEqual(msg1);
		});
	});
	describe('Message Delete', () => {
		it('should delete a message', async () => {
			await elastic.upsertMessage(msg1);
			const deletedMessage = await elastic.deleteMessage(msg1.id);
			expect(deletedMessage).toBeTruthy();
			const fetchedDeletedMessage = await elastic.getMessage(msg1.id);
			expect(fetchedDeletedMessage).toBeNull();
		});
		it('should delete a message that does not exist', async () => {
			const deletedMessage = await elastic.deleteMessage(msg1.id);
			expect(deletedMessage).toBeFalsy();
		});
	});
	describe('Message Delete Bulk', () => {
		it('should bulk delete messages that exist', async () => {
			await elastic.upsertMessage(msg1);
			await elastic.upsertMessage(msg2);
			const deletedMessages = await elastic.bulkDeleteMessages([
				msg1.id,
				msg2.id,
			]);
			expect(deletedMessages).toBeTruthy();
			const fetchedDeletedMessage1 = await elastic.getMessage(msg1.id);
			expect(fetchedDeletedMessage1).toBeNull();
			const fetchedDeletedMessage2 = await elastic.getMessage(msg2.id);
			expect(fetchedDeletedMessage2).toBeNull();
		});
		it('should bulk delete messages that do not exist', async () => {
			const deletedMessages = await elastic.bulkDeleteMessages([
				msg1.id,
				msg2.id,
			]);
			expect(deletedMessages).toBeTruthy();
		});
		it('should bulk delete a message that does exist and one that does not', async () => {
			await elastic.upsertMessage(msg1);
			const deletedMessages = await elastic.bulkDeleteMessages([
				msg1.id,
				msg2.id,
			]);
			expect(deletedMessages).toBeTruthy();
			const fetchedDeletedMessage1 = await elastic.getMessage(msg1.id);
			expect(fetchedDeletedMessage1).toBeNull();
			const fetchedDeletedMessage2 = await elastic.getMessage(msg2.id);
			expect(fetchedDeletedMessage2).toBeNull();
		});
	});
	describe('Message Delete By Channel Id', () => {
		it('should delete a message by thread id', async () => {
			const threadMessage = {
				...msg1,
				channelId: getRandomId(),
			};
			await elastic.upsertMessage(threadMessage);
			const deletedMessage = await elastic.deleteByChannelId(
				threadMessage.channelId,
			);
			expect(deletedMessage).toBe(1);
			// wait 1 second
			const fetchedDeletedMessage = await elastic.getMessage(threadMessage.id);
			expect(fetchedDeletedMessage).toBeNull();
		});
	});
	describe('Delete by user id', () => {
		it('should delete a message by user id', async () => {
			const userMessage = {
				...msg1,
				authorId: getRandomId(),
			};
			await elastic.upsertMessage(userMessage);
			const created = await elastic.getMessage(userMessage.id);
			expect(created).toBeDefined();
			const deletedMessage = await elastic.deleteByUserId(userMessage.authorId);
			expect(deletedMessage).toBe(1);
			// wait 1 second
			const fetchedDeletedMessage = await elastic.getMessage(userMessage.id);
			expect(fetchedDeletedMessage).toBeNull();
		});
	});
	describe('Delete by user id in a server', () => {
		it('should delete a message by user id in a server', async () => {
			const userMessage = {
				...msg1,
				authorId: getRandomId(),
				serverId: getRandomId(),
			};
			await elastic.upsertMessage(userMessage);
			const created = await elastic.getMessage(userMessage.id);
			expect(created).toBeDefined();
			const deletedMessage = await elastic.deleteByUserIdInServer({
				userId: userMessage.authorId,
				serverId: userMessage.serverId,
			});
			expect(deletedMessage).toBe(1);
			// wait 1 second
			const fetchedDeletedMessage = await elastic.getMessage(userMessage.id);
			expect(fetchedDeletedMessage).toBeNull();
		});
	});
	describe('Message Fetch', () => {
		it('should search for a message', async () => {
			await elastic.upsertMessage(msg1);
			const fetchedMessage = await elastic.getMessage(msg1.id);
			expect(fetchedMessage).toBeDefined();
			expect(fetchedMessage!.id).toBe(msg1.id);
			expect(fetchedMessage).toEqual(msg1);
		});
	});
	describe('Message Fetch Bulk', () => {
		it('should bulk fetch messages', async () => {
			await elastic.upsertMessage(msg1);
			await elastic.upsertMessage(msg2);
			const fetchedMessages = await elastic.bulkGetMessages([msg1.id, msg2.id]);
			expect(fetchedMessages).toBeDefined();
			expect(fetchedMessages).toHaveLength(2);
			expect(fetchedMessages).toEqual([msg1, msg2]);
		});
		it('should return an empty array if no messages are found', async () => {
			const fetchedMessages = await elastic.bulkGetMessages([msg1.id, msg2.id]);
			expect(fetchedMessages).toBeDefined();
			expect(fetchedMessages).toHaveLength(0);
		});
	});

	describe('Messages Fetch By Channel Id', () => {
		it('should fetch messages by channel id', async () => {
			await elastic.upsertMessage(msg1);
			await elastic.upsertMessage({
				...msg2,
				channelId: msg1.channelId,
			});

			const fetchedMessages = await elastic.bulkGetMessagesByChannelId(
				msg1.channelId,
			);
			expect(fetchedMessages).toBeDefined();
			expect(fetchedMessages).toHaveLength(2);
		});
	});
	describe('Search', () => {
		it('should search for messages by content', async () => {
			const content = getRandomId();
			await elastic.upsertMessage({
				...msg1,
				content,
			});
			const searchResults = await elastic.searchMessages({
				limit: 20,
				query: content,
			});
			expect(searchResults).toBeDefined();
			expect(searchResults).toHaveLength(1);
			expect(
				searchResults.find((msg) => msg._source.content === content),
			).toBeDefined();
		});
		it('should search for messages by server id', async () => {
			const content = getRandomId();
			await elastic.upsertMessage({
				...msg1,
				content,
			});
			const serverId2 = getRandomId();
			await elastic.upsertMessage({
				...msg2,
				serverId: serverId2,
				content,
			});
			const searchResults = await elastic.searchMessages({
				limit: 20,
				query: content,
				serverId: serverId2,
			});
			expect(searchResults).toBeDefined();
			expect(searchResults).toHaveLength(1);
			expect(
				searchResults.find((msg) => msg._source.content === content),
			).toBeDefined();
		});
		it('should return an empty array if no messages are found', async () => {
			const searchResults = await elastic.searchMessages({
				limit: 20,
				query: getRandomId(),
			});
			expect(searchResults).toBeDefined();
			expect(searchResults).toHaveLength(0);
		});
		it('should return a limited number of messages', async () => {
			const content = getRandomId();
			await elastic.upsertMessage({
				...msg1,
				content,
			});
			await elastic.upsertMessage({
				...msg2,
				content,
			});
			const searchResults = await elastic.searchMessages({
				query: content,
				limit: 1,
			});
			expect(searchResults).toBeDefined();
			expect(searchResults).toHaveLength(1);
		});
		it('should search for a message by channel id', async () => {
			const content = getRandomId();
			const targetChannelId = getRandomId();
			await elastic.upsertMessage({
				...msg1,
				channelId: targetChannelId,
				content,
			});
			await elastic.upsertMessage({
				...msg1,
				id: getRandomId(),
				channelId: getRandomId(),
				content,
			});
			const searchResults = await elastic.searchMessages({
				limit: 20,
				query: content,
				channelId: targetChannelId,
			});
			expect(searchResults).toBeDefined();
			expect(searchResults).toHaveLength(1);
			expect(
				searchResults.find((msg) => msg._source.content === content),
			).toBeDefined();
		});
	});
	describe('Message Update', () => {
		it('should update a message', async () => {
			await elastic.upsertMessage(msg1);
			const updatedMessage = {
				...msg1,
				content: getRandomId(),
			};
			await elastic.updateMessage(updatedMessage);
			const fetchedMessage = await elastic.getMessage(msg1.id);
			expect(fetchedMessage).toBeDefined();
			expect(fetchedMessage).toEqual(updatedMessage);
		});
		it('should return null if the message does not exist', async () => {
			const updatedMessage = {
				...msg1,
				content: getRandomId(),
			};
			const result = await elastic.updateMessage(updatedMessage);
			expect(result).toBeNull();
		});
	});
	describe('Get channel message count', () => {
		it('should return the number of messages in a channel', async () => {
			await elastic.upsertMessage(msg1);
			await elastic.upsertMessage({
				...msg2,
				channelId: msg1.channelId,
			});
			const count = await elastic.getChannelMessagesCount(msg1.channelId);
			expect(count).toBe(2);
		});
		it('should return 0 if there are no messages in a channel', async () => {
			const count = await elastic.getChannelMessagesCount(msg1.channelId);
			expect(count).toBe(0);
		});
	});
	describe('find latest message in channel', () => {
		it('should return the latest message in a channel', async () => {
			await elastic.upsertMessage(msg1);
			const lastMsg = {
				...msg1,
				id: getRandomIdGreaterThan(parseInt(msg1.id)),
			};
			await elastic.upsertMessage(lastMsg);
			const latestMessage = await elastic.findLatestMessageInChannel(
				msg1.channelId,
			);
			expect(latestMessage).toBeDefined();
			expect(latestMessage).toEqual(lastMsg);
		});
		it('should return the first message if there is only one message in a channel', async () => {
			await elastic.upsertMessage(msg1);
			const latestMessage = await elastic.findLatestMessageInChannel(
				msg1.channelId,
			);
			expect(latestMessage).toBeDefined();
			expect(latestMessage).toEqual(msg1);
		});
		it('should return null if there are no messages in a channel', async () => {
			const latestMessage = await elastic.findLatestMessageInChannel(
				msg1.channelId,
			);
			expect(latestMessage).toBeNull();
		});
	});
});
