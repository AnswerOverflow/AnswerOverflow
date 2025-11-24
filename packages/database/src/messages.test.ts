import { expect, it } from "@effect/vitest";
import { generateSnowflakeString } from "@packages/test-utils/snowflakes";
import { Effect } from "effect";
import type { Channel, Emoji, Message, Server } from "../convex/schema";
import type { DatabaseAttachment } from "../convex/shared/shared";
import { Database } from "./database";
import { DatabaseTestLayer } from "./database-test";

const testServer: Server = {
	name: "Test Server",
	description: "Test Description",
	icon: "https://example.com/icon.png",
	vanityInviteCode: "test",
	vanityUrl: "test",
	discordId: "server123",
	plan: "FREE",
	approximateMemberCount: 0,
};

const createTestChannel = (
	id: string,
	serverId: string,
	overrides?: Partial<Channel>,
): Channel => ({
	id,
	serverId,
	name: `Channel ${id}`,
	type: 0, // GuildText
	parentId: undefined,
	inviteCode: undefined,
	archivedTimestamp: undefined,
	solutionTagId: undefined,
	lastIndexedSnowflake: undefined,
	...overrides,
});

const createTestMessage = (
	id: string,
	authorId: string,
	serverId: string,
	channelId: string,
	overrides?: Partial<Message>,
): Message => ({
	id,
	authorId,
	serverId,
	channelId,
	content: `Message ${id}`,
	parentChannelId: undefined,
	childThreadId: undefined,
	questionId: undefined,
	referenceId: undefined,
	applicationId: undefined,
	interactionId: undefined,
	webhookId: undefined,
	flags: undefined,
	type: undefined,
	pinned: undefined,
	nonce: undefined,
	tts: undefined,
	embeds: undefined,
	...overrides,
});

const createTestAttachment = (
	id: string,
	messageId: string,
	overrides?: Partial<DatabaseAttachment>,
): DatabaseAttachment => ({
	id,
	messageId,
	filename: `file-${id}.txt`,
	size: 1000,
	contentType: undefined,
	width: undefined,
	height: undefined,
	description: undefined,
	storageId: undefined,
	...overrides,
});

const createTestEmoji = (id: string, name: string): Emoji => ({
	id,
	name,
});

it.scoped("upsertMessage creates a new message", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(testServer);
		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: "server123",
			},
		);
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.private.channels.upsertChannelWithSettings({ channel });

		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		yield* database.private.messages.upsertMessage({
			message,
			ignoreChecks: true,
		});

		const liveData = yield* database.private.messages.getMessageById({
			id: "message123",
		});

		expect(liveData?.id).toBe("message123");
		expect(liveData?.content).toBe("Message message123");
		expect(liveData?.authorId).toBe("author123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertMessage updates an existing message", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(testServer);
		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: "server123",
			},
		);
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.private.channels.upsertChannelWithSettings({ channel });

		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
			{ content: "Original content" },
		);

		yield* database.private.messages.upsertMessage({
			message,
			ignoreChecks: true,
		});

		const updatedMessage = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
			{ content: "Updated content" },
		);

		yield* database.private.messages.upsertMessage({
			message: updatedMessage,
			ignoreChecks: true,
		});

		const liveData = yield* database.private.messages.getMessageById({
			id: "message123",
		});

		expect(liveData?.content).toBe("Updated content");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertMessage with attachments", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(testServer);
		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: "server123",
			},
		);
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.private.channels.upsertChannelWithSettings({ channel });

		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		const attachment1 = createTestAttachment("attach1", "message123");
		const attachment2 = createTestAttachment("attach2", "message123");

		yield* database.private.messages.upsertMessage({
			message,
			attachments: [attachment1, attachment2],
			ignoreChecks: true,
		});

		const liveData = yield* database.private.messages.getMessageById({
			id: "message123",
		});

		expect(liveData?.id).toBe("message123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertMessage with reactions", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(testServer);
		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: "server123",
			},
		);
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.private.channels.upsertChannelWithSettings({ channel });

		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		const emoji1 = createTestEmoji("emoji1", "👍");
		const emoji2 = createTestEmoji("emoji2", "❤️");

		yield* database.private.messages.upsertMessage({
			message,
			reactions: [
				{ userId: "user1", emoji: emoji1 },
				{ userId: "user2", emoji: emoji2 },
			],
			ignoreChecks: true,
		});

		const liveData = yield* database.private.messages.getMessageById({
			id: "message123",
		});

		expect(liveData?.id).toBe("message123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertManyMessages creates multiple messages", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(testServer);
		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: "server123",
			},
		);
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.private.channels.upsertChannelWithSettings({ channel });
		const message001 = generateSnowflakeString();
		const message002 = generateSnowflakeString();
		const message003 = generateSnowflakeString();
		const messages = [
			createTestMessage(message001, "author1", serverId, "channel123"),
			createTestMessage(message002, "author2", serverId, "channel123"),
			createTestMessage(message003, "author3", serverId, "channel123"),
		];

		yield* database.private.messages.upsertManyMessages({
			messages: messages.map((msg) => ({ message: msg })),
			ignoreChecks: true,
		});

		const liveData1 = yield* database.private.messages.getMessageById({
			id: message001,
		});
		const liveData2 = yield* database.private.messages.getMessageById({
			id: message002,
		});
		const liveData3 = yield* database.private.messages.getMessageById({
			id: message003,
		});

		expect(liveData1?.id).toBe(message001);
		expect(liveData2?.id).toBe(message002);
		expect(liveData3?.id).toBe(message003);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findMessagesByChannelId returns messages for a channel", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(testServer);
		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: "server123",
			},
		);
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.private.channels.upsertChannelWithSettings({ channel });

		const message001 = generateSnowflakeString();
		const message002 = generateSnowflakeString();
		const message003 = generateSnowflakeString();
		const messages = [
			createTestMessage(message001, "author1", serverId, "channel123"),
			createTestMessage(message002, "author2", serverId, "channel123"),
			createTestMessage(message003, "author3", serverId, "channel123"),
		];

		yield* database.private.messages.upsertManyMessages({
			messages: messages.map((msg) => ({ message: msg })),
			ignoreChecks: true,
		});

		const liveData = yield* database.private.messages.findMessagesByChannelId({
			channelId: "channel123",
			limit: 10,
		});

		expect(liveData?.length).toBeGreaterThanOrEqual(3);
		const messageIds = liveData?.map((m) => m.id) ?? [];
		expect(messageIds).toContain(message001);
		expect(messageIds).toContain(message002);
		expect(messageIds).toContain(message003);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("deleteMessage removes a message", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(testServer);
		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: "server123",
			},
		);
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.private.channels.upsertChannelWithSettings({ channel });

		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		yield* database.private.messages.upsertMessage({
			message,
			ignoreChecks: true,
		});

		const beforeDelete = yield* database.private.messages.getMessageById({
			id: "message123",
		});
		expect(beforeDelete?.id).toBe("message123");

		yield* database.private.messages.deleteMessage({ id: "message123" });

		const afterDelete = yield* database.private.messages.getMessageById({
			id: "message123",
		});
		expect(afterDelete).toBeNull();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("deleteManyMessages removes multiple messages", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(testServer);
		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: "server123",
			},
		);
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.private.channels.upsertChannelWithSettings({ channel });

		const message001 = generateSnowflakeString();
		const message002 = generateSnowflakeString();
		const message003 = generateSnowflakeString();
		const messages = [
			createTestMessage(message001, "author1", serverId, "channel123"),
			createTestMessage(message002, "author2", serverId, "channel123"),
			createTestMessage(message003, "author3", serverId, "channel123"),
		];

		yield* database.private.messages.upsertManyMessages({
			messages: messages.map((msg) => ({ message: msg })),
			ignoreChecks: true,
		});

		yield* database.private.messages.deleteManyMessages({
			ids: [message001, message002],
		});

		const deleted1 = yield* database.private.messages.getMessageById({
			id: message001,
		});
		const deleted2 = yield* database.private.messages.getMessageById({
			id: message002,
		});
		const remaining = yield* database.private.messages.getMessageById({
			id: message003,
		});

		expect(deleted1).toBeNull();
		expect(deleted2).toBeNull();
		expect(remaining?.id).toBe(message003);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findMessagesByAuthorId returns messages by author", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(testServer);
		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: "server123",
			},
		);
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.private.channels.upsertChannelWithSettings({ channel });

		const messages = [
			createTestMessage("message1", "author123", serverId, "channel123"),
			createTestMessage("message2", "author123", serverId, "channel123"),
			createTestMessage("message3", "author456", serverId, "channel123"),
		];

		yield* database.private.messages.upsertManyMessages({
			messages: messages.map((msg) => ({ message: msg })),
			ignoreChecks: true,
		});

		const liveData = yield* database.private.messages.findMessagesByAuthorId({
			authorId: "author123",
			limit: 10,
		});

		expect(liveData?.length).toBeGreaterThanOrEqual(2);
		const authorIds = liveData?.map((m) => m.authorId) ?? [];
		expect(authorIds.every((id) => id === "author123")).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findAttachmentsByMessageId returns attachments for a message", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(testServer);
		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: "server123",
			},
		);
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.private.channels.upsertChannelWithSettings({ channel });

		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		const attachment1 = createTestAttachment("attach1", "message123");
		const attachment2 = createTestAttachment("attach2", "message123");

		yield* database.private.messages.upsertMessage({
			message,
			attachments: [attachment1, attachment2],
			ignoreChecks: true,
		});

		const liveData =
			yield* database.private.messages.findAttachmentsByMessageId({
				messageId: "message123",
			});

		expect(liveData?.length).toBe(2);
		const attachmentIds = liveData?.map((a) => a.id) ?? [];
		expect(attachmentIds).toContain("attach1");
		expect(attachmentIds).toContain("attach2");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findReactionsByMessageId returns reactions for a message", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(testServer);
		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: "server123",
			},
		);
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.private.channels.upsertChannelWithSettings({ channel });

		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		const emoji1 = createTestEmoji("emoji1", "👍");
		const emoji2 = createTestEmoji("emoji2", "❤️");

		yield* database.private.messages.upsertMessage({
			message,
			reactions: [
				{ userId: "user1", emoji: emoji1 },
				{ userId: "user2", emoji: emoji2 },
			],
			ignoreChecks: true,
		});

		const liveData = yield* database.private.messages.findReactionsByMessageId({
			messageId: "message123",
		});

		expect(liveData?.length).toBe(2);
		const reactionMessageIds = liveData?.map((r) => r.messageId) ?? [];
		expect(reactionMessageIds.every((id) => id === "message123")).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findSolutionsByQuestionId returns solutions for a question", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(testServer);
		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: "server123",
			},
		);
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.private.channels.upsertChannelWithSettings({ channel });

		const questionMessage = createTestMessage(
			"question123",
			"author123",
			serverId,
			"channel123",
		);
		yield* database.private.messages.upsertMessage({
			message: questionMessage,
			ignoreChecks: true,
		});

		const solution1 = createTestMessage(
			"solution1",
			"author456",
			serverId,
			"channel123",
			{
				questionId: "question123",
			},
		);
		const solution2 = createTestMessage(
			"solution2",
			"author789",
			serverId,
			"channel123",
			{
				questionId: "question123",
			},
		);

		yield* database.private.messages.upsertMessage({
			message: solution1,
			ignoreChecks: true,
		});
		yield* database.private.messages.upsertMessage({
			message: solution2,
			ignoreChecks: true,
		});

		const liveData = yield* database.private.messages.findSolutionsByQuestionId(
			{
				questionId: "question123",
			},
		);

		expect(liveData?.length).toBe(2);
		const solutionIds = liveData?.map((m) => m.id) ?? [];
		expect(solutionIds).toContain("solution1");
		expect(solutionIds).toContain("solution2");

		const questionIds = liveData?.map((m) => m.questionId) ?? [];
		expect(questionIds.every((id) => id === "question123")).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);
