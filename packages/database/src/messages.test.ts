import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import type { Id } from "../convex/_generated/dataModel";
import type {
	Attachment,
	Channel,
	Emoji,
	Message,
	Server,
} from "../convex/schema";
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
	overrides?: Partial<Attachment>,
): Attachment => ({
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

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		yield* database.messages.upsertMessage({
			message,
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.getMessageById({
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

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
			{ content: "Original content" },
		);

		yield* database.messages.upsertMessage({
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

		yield* database.messages.upsertMessage({
			message: updatedMessage,
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.getMessageById({
			id: "message123",
		});

		expect(liveData?.content).toBe("Updated content");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertMessage with attachments", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		const attachment1 = createTestAttachment("attach1", "message123");
		const attachment2 = createTestAttachment("attach2", "message123");

		yield* database.messages.upsertMessage({
			message,
			attachments: [attachment1, attachment2],
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.getMessageById({
			id: "message123",
		});

		expect(liveData?.id).toBe("message123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertMessage with reactions", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		const emoji1 = createTestEmoji("emoji1", "👍");
		const emoji2 = createTestEmoji("emoji2", "❤️");

		yield* database.messages.upsertMessage({
			message,
			reactions: [
				{ userId: "user1", emoji: emoji1 },
				{ userId: "user2", emoji: emoji2 },
			],
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.getMessageById({
			id: "message123",
		});

		expect(liveData?.id).toBe("message123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertManyMessages creates multiple messages", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		const messages = [
			createTestMessage("message1", "author1", serverId, "channel123"),
			createTestMessage("message2", "author2", serverId, "channel123"),
			createTestMessage("message3", "author3", serverId, "channel123"),
		];

		yield* database.messages.upsertManyMessages({
			messages: messages.map((msg) => ({ message: msg })),
			ignoreChecks: true,
		});

		const liveData1 = yield* database.messages.getMessageById({
			id: "message1",
		});
		const liveData2 = yield* database.messages.getMessageById({
			id: "message2",
		});
		const liveData3 = yield* database.messages.getMessageById({
			id: "message3",
		});

		expect(liveData1?.id).toBe("message1");
		expect(liveData2?.id).toBe("message2");
		expect(liveData3?.id).toBe("message3");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findMessagesByChannelId returns messages for a channel", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		const messages = [
			createTestMessage("message1", "author1", serverId, "channel123"),
			createTestMessage("message2", "author2", serverId, "channel123"),
			createTestMessage("message3", "author3", serverId, "channel123"),
		];

		yield* database.messages.upsertManyMessages({
			messages: messages.map((msg) => ({ message: msg })),
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.findMessagesByChannelId({
			channelId: "channel123",
			limit: 10,
		});

		expect(liveData?.length).toBeGreaterThanOrEqual(3);
		const messageIds = liveData?.map((m) => m.id) ?? [];
		expect(messageIds).toContain("message1");
		expect(messageIds).toContain("message2");
		expect(messageIds).toContain("message3");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findManyMessagesById returns messages by ids", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		const messages = [
			createTestMessage("message1", "author1", serverId, "channel123"),
			createTestMessage("message2", "author2", serverId, "channel123"),
			createTestMessage("message3", "author3", serverId, "channel123"),
		];

		yield* database.messages.upsertManyMessages({
			messages: messages.map((msg) => ({ message: msg })),
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.findManyMessagesById({
			ids: ["message1", "message2", "message3"],
		});

		expect(liveData?.length).toBe(3);
		const messageIds = liveData?.map((m) => m.id) ?? [];
		expect(messageIds).toContain("message1");
		expect(messageIds).toContain("message2");
		expect(messageIds).toContain("message3");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("deleteMessage removes a message", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		yield* database.messages.upsertMessage({
			message,
			ignoreChecks: true,
		});

		const beforeDelete = yield* database.messages.getMessageById({
			id: "message123",
		});
		expect(beforeDelete?.id).toBe("message123");

		yield* database.messages.deleteMessage({ id: "message123" });

		const afterDelete = yield* database.messages.getMessageById({
			id: "message123",
		});
		expect(afterDelete).toBeNull();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("deleteManyMessages removes multiple messages", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		const messages = [
			createTestMessage("message1", "author1", serverId, "channel123"),
			createTestMessage("message2", "author2", serverId, "channel123"),
			createTestMessage("message3", "author3", serverId, "channel123"),
		];

		yield* database.messages.upsertManyMessages({
			messages: messages.map((msg) => ({ message: msg })),
			ignoreChecks: true,
		});

		yield* database.messages.deleteManyMessages({
			ids: ["message1", "message2"],
		});

		const deleted1 = yield* database.messages.getMessageById({
			id: "message1",
		});
		const deleted2 = yield* database.messages.getMessageById({
			id: "message2",
		});
		const remaining = yield* database.messages.getMessageById({
			id: "message3",
		});

		expect(deleted1).toBeNull();
		expect(deleted2).toBeNull();
		expect(remaining?.id).toBe("message3");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findMessagesByAuthorId returns messages by author", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		const messages = [
			createTestMessage("message1", "author123", serverId, "channel123"),
			createTestMessage("message2", "author123", serverId, "channel123"),
			createTestMessage("message3", "author456", serverId, "channel123"),
		];

		yield* database.messages.upsertManyMessages({
			messages: messages.map((msg) => ({ message: msg })),
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.findMessagesByAuthorId({
			authorId: "author123",
			limit: 10,
		});

		expect(liveData?.length).toBeGreaterThanOrEqual(2);
		const authorIds = liveData?.map((m) => m.authorId) ?? [];
		expect(authorIds.every((id) => id === "author123")).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findMessagesByServerId returns messages by server", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		const messages = [
			createTestMessage("message1", "author1", serverId, "channel123"),
			createTestMessage("message2", "author2", serverId, "channel123"),
			createTestMessage("message3", "author3", serverId, "channel123"),
		];

		yield* database.messages.upsertManyMessages({
			messages: messages.map((msg) => ({ message: msg })),
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.findMessagesByServerId({
			serverId,
			limit: 10,
		});

		expect(liveData?.length).toBeGreaterThanOrEqual(3);
		const serverIds = liveData?.map((m) => m.serverId) ?? [];
		expect(serverIds.every((id) => id === serverId)).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findMessagesByParentChannelId returns thread messages", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const parentChannel = createTestChannel("parent123", serverId);
		yield* database.channels.upsertChannelWithSettings({
			channel: parentChannel,
		});

		const threadChannel = createTestChannel("thread123", serverId, {
			parentId: "parent123",
			type: 11, // PublicThread
		});
		yield* database.channels.upsertChannelWithSettings({
			channel: threadChannel,
		});

		const messages = [
			createTestMessage("message1", "author1", serverId, "thread123", {
				parentChannelId: "parent123",
			}),
			createTestMessage("message2", "author2", serverId, "thread123", {
				parentChannelId: "parent123",
			}),
		];

		yield* database.messages.upsertManyMessages({
			messages: messages.map((msg) => ({ message: msg })),
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.findMessagesByParentChannelId({
			parentChannelId: "parent123",
			limit: 10,
		});

		expect(liveData?.length).toBeGreaterThanOrEqual(2);
		const parentChannelIds = liveData?.map((m) => m.parentChannelId) ?? [];
		expect(parentChannelIds.every((id) => id === "parent123")).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findLatestMessageInChannel returns latest message", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		const messages = [
			createTestMessage("100", "author1", serverId, "channel123"),
			createTestMessage("200", "author2", serverId, "channel123"),
			createTestMessage("300", "author3", serverId, "channel123"),
		];

		yield* database.messages.upsertManyMessages({
			messages: messages.map((msg) => ({ message: msg })),
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.findLatestMessageInChannel({
			channelId: "channel123",
		});

		expect(liveData).not.toBeNull();
		expect(liveData?.channelId).toBe("channel123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"findLatestMessageInChannelAndThreads returns latest across channel and threads",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			yield* database.servers.upsertServer(testServer);
			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: "server123",
			});
			const serverId = serverLiveData?.discordId;

			if (!serverId) {
				throw new Error("Server not found");
			}

			const parentChannel = createTestChannel("parent123", serverId);
			yield* database.channels.upsertChannelWithSettings({
				channel: parentChannel,
			});

			const threadChannel = createTestChannel("thread123", serverId, {
				parentId: "parent123",
				type: 11, // PublicThread
			});
			yield* database.channels.upsertChannelWithSettings({
				channel: threadChannel,
			});

			const parentMessage = createTestMessage(
				"100",
				"author1",
				serverId,
				"parent123",
			);
			yield* database.messages.upsertMessage({
				message: parentMessage,
				ignoreChecks: true,
			});

			const threadMessage = createTestMessage(
				"200",
				"author2",
				serverId,
				"thread123",
				{
					parentChannelId: "parent123",
				},
			);
			yield* database.messages.upsertMessage({
				message: threadMessage,
				ignoreChecks: true,
			});

			const liveData =
				yield* database.messages.findLatestMessageInChannelAndThreads({
					channelId: "parent123",
				});

			expect(liveData).not.toBeNull();
			expect(liveData?.id).toBe("200");
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findAttachmentsByMessageId returns attachments for a message", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		const attachment1 = createTestAttachment("attach1", "message123");
		const attachment2 = createTestAttachment("attach2", "message123");

		yield* database.messages.upsertMessage({
			message,
			attachments: [attachment1, attachment2],
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.findAttachmentsByMessageId({
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

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		const emoji1 = createTestEmoji("emoji1", "👍");
		const emoji2 = createTestEmoji("emoji2", "❤️");

		yield* database.messages.upsertMessage({
			message,
			reactions: [
				{ userId: "user1", emoji: emoji1 },
				{ userId: "user2", emoji: emoji2 },
			],
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.findReactionsByMessageId({
			messageId: "message123",
		});

		expect(liveData?.length).toBe(2);
		const reactionMessageIds = liveData?.map((r) => r.messageId) ?? [];
		expect(reactionMessageIds.every((id) => id === "message123")).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findEmojiById returns emoji by ID", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		const emoji = createTestEmoji("emoji123", "👍");

		yield* database.messages.upsertMessage({
			message,
			reactions: [{ userId: "user1", emoji }],
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.findEmojiById({ id: "emoji123" });

		expect(liveData?.id).toBe("emoji123");
		expect(liveData?.name).toBe("👍");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"deleteManyMessagesByChannelId removes all messages in a channel",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			yield* database.servers.upsertServer(testServer);
			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: "server123",
			});
			const serverId = serverLiveData?.discordId;

			if (!serverId) {
				throw new Error("Server not found");
			}

			const channel = createTestChannel("channel123", serverId);
			yield* database.channels.upsertChannelWithSettings({ channel });

			const messages = [
				createTestMessage("message1", "author1", serverId, "channel123"),
				createTestMessage("message2", "author2", serverId, "channel123"),
				createTestMessage("message3", "author3", serverId, "channel123"),
			];

			yield* database.messages.upsertManyMessages({
				messages: messages.map((msg) => ({ message: msg })),
				ignoreChecks: true,
			});

			yield* database.messages.deleteManyMessagesByChannelId({
				channelId: "channel123",
			});

			const liveData = yield* database.messages.findMessagesByChannelId({
				channelId: "channel123",
			});
			expect(liveData?.length).toBe(0);
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("deleteManyMessagesByUserId removes all messages by a user", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		const messages = [
			createTestMessage("message1", "author123", serverId, "channel123"),
			createTestMessage("message2", "author123", serverId, "channel123"),
			createTestMessage("message3", "author456", serverId, "channel123"),
		];

		yield* database.messages.upsertManyMessages({
			messages: messages.map((msg) => ({ message: msg })),
			ignoreChecks: true,
		});

		yield* database.messages.deleteManyMessagesByUserId({
			userId: "author123",
		});

		const author123Messages = yield* database.messages.findMessagesByAuthorId({
			authorId: "author123",
		});
		expect(author123Messages?.length).toBe(0);

		const author456Messages = yield* database.messages.findMessagesByAuthorId({
			authorId: "author456",
		});
		expect(author456Messages?.length).toBeGreaterThanOrEqual(1);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findSolutionsByQuestionId returns solutions for a question", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		const questionMessage = createTestMessage(
			"question123",
			"author123",
			serverId,
			"channel123",
		);
		yield* database.messages.upsertMessage({
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

		yield* database.messages.upsertMessage({
			message: solution1,
			ignoreChecks: true,
		});
		yield* database.messages.upsertMessage({
			message: solution2,
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.findSolutionsByQuestionId({
			questionId: "question123",
		});

		expect(liveData?.length).toBe(2);
		const solutionIds = liveData?.map((m) => m.id) ?? [];
		expect(solutionIds).toContain("solution1");
		expect(solutionIds).toContain("solution2");

		const questionIds = liveData?.map((m) => m.questionId) ?? [];
		expect(questionIds.every((id) => id === "question123")).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);
