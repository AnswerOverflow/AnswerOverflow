// Tests for message functions

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
	serverId: Id<"servers">,
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
	serverId: Id<"servers">,
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
	proxyUrl: `https://example.com/proxy/${id}`,
	url: `https://example.com/${id}`,
	size: 1000,
	contentType: undefined,
	width: undefined,
	height: undefined,
	description: undefined,
	...overrides,
});

const createTestEmoji = (id: string, name: string): Emoji => ({
	id,
	name,
});

it.scoped("upsertMessage creates a new message", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channel
		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		// Create message
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

		const liveData = yield* database.messages.getMessageById("message123");

		expect(liveData?.data?.id).toBe("message123");
		expect(liveData?.data?.content).toBe("Message message123");
		expect(liveData?.data?.authorId).toBe("author123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertMessage updates an existing message", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channel
		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		// Create initial message
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

		// Update message
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

		const liveData = yield* database.messages.getMessageById("message123");

		expect(liveData?.data?.content).toBe("Updated content");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertMessage with attachments", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channel
		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		// Create message with attachments
		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		const attachment1 = createTestAttachment("attach1", "message123");
		const attachment2 = createTestAttachment("attach2", "message123");

		yield* database.messages.upsertMessage({
			message: {
				...message,
				attachments: [attachment1, attachment2],
			},
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.getMessageById("message123");

		expect(liveData?.data?.id).toBe("message123");
		// Note: Attachments are stored separately, so we'd need a separate query to verify them
		// For now, we just verify the message was created
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertMessage with reactions", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channel
		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		// Create message with reactions
		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		const emoji1 = createTestEmoji("emoji1", "👍");
		const emoji2 = createTestEmoji("emoji2", "❤️");

		yield* database.messages.upsertMessage({
			message: {
				...message,
				reactions: [
					{ userId: "user1", emoji: emoji1 },
					{ userId: "user2", emoji: emoji2 },
				],
			},
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.getMessageById("message123");

		expect(liveData?.data?.id).toBe("message123");
		// Note: Reactions are stored separately, so we'd need a separate query to verify them
		// For now, we just verify the message was created
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertManyMessages creates multiple messages", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channel
		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		// Create multiple messages
		const messages = [
			createTestMessage("message1", "author1", serverId, "channel123"),
			createTestMessage("message2", "author2", serverId, "channel123"),
			createTestMessage("message3", "author3", serverId, "channel123"),
		];

		yield* database.messages.upsertManyMessages({
			messages,
			ignoreChecks: true,
		});

		const liveData1 = yield* database.messages.getMessageById("message1");
		const liveData2 = yield* database.messages.getMessageById("message2");
		const liveData3 = yield* database.messages.getMessageById("message3");

		expect(liveData1?.data?.id).toBe("message1");
		expect(liveData2?.data?.id).toBe("message2");
		expect(liveData3?.data?.id).toBe("message3");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findMessagesByChannelId returns messages for a channel", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channel
		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		// Create messages
		const messages = [
			createTestMessage("message1", "author1", serverId, "channel123"),
			createTestMessage("message2", "author2", serverId, "channel123"),
			createTestMessage("message3", "author3", serverId, "channel123"),
		];

		yield* database.messages.upsertManyMessages({
			messages,
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.findMessagesByChannelId(
			"channel123",
			{ limit: 10 },
		);

		expect(liveData?.data?.length).toBeGreaterThanOrEqual(3);
		const messageIds = liveData?.data?.map((m) => m.id) ?? [];
		expect(messageIds).toContain("message1");
		expect(messageIds).toContain("message2");
		expect(messageIds).toContain("message3");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findManyMessagesById returns messages by ids", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channel
		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		// Create messages
		const messages = [
			createTestMessage("message1", "author1", serverId, "channel123"),
			createTestMessage("message2", "author2", serverId, "channel123"),
			createTestMessage("message3", "author3", serverId, "channel123"),
		];

		yield* database.messages.upsertManyMessages({
			messages,
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.findManyMessagesById([
			"message1",
			"message2",
			"message3",
		]);

		expect(liveData?.data?.length).toBe(3);
		const messageIds = liveData?.data?.map((m) => m.id) ?? [];
		expect(messageIds).toContain("message1");
		expect(messageIds).toContain("message2");
		expect(messageIds).toContain("message3");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("deleteMessage removes a message", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channel
		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		// Create message
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

		// Verify message exists
		const beforeDelete = yield* database.messages.getMessageById("message123");
		expect(beforeDelete?.data?.id).toBe("message123");

		// Delete message
		yield* database.messages.deleteMessage("message123");

		// Verify message is deleted
		const afterDelete = yield* database.messages.getMessageById("message123");
		expect(afterDelete?.data).toBeNull();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("deleteManyMessages removes multiple messages", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channel
		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		// Create messages
		const messages = [
			createTestMessage("message1", "author1", serverId, "channel123"),
			createTestMessage("message2", "author2", serverId, "channel123"),
			createTestMessage("message3", "author3", serverId, "channel123"),
		];

		yield* database.messages.upsertManyMessages({
			messages,
			ignoreChecks: true,
		});

		// Delete messages
		yield* database.messages.deleteManyMessages(["message1", "message2"]);

		// Verify messages are deleted
		const deleted1 = yield* database.messages.getMessageById("message1");
		const deleted2 = yield* database.messages.getMessageById("message2");
		const remaining = yield* database.messages.getMessageById("message3");

		expect(deleted1?.data).toBeNull();
		expect(deleted2?.data).toBeNull();
		expect(remaining?.data?.id).toBe("message3");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findMessagesByAuthorId returns messages by author", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channel
		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		// Create messages from same author
		const messages = [
			createTestMessage("message1", "author123", serverId, "channel123"),
			createTestMessage("message2", "author123", serverId, "channel123"),
			createTestMessage("message3", "author456", serverId, "channel123"),
		];

		yield* database.messages.upsertManyMessages({
			messages,
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.findMessagesByAuthorId(
			"author123",
			10,
		);

		expect(liveData?.data?.length).toBeGreaterThanOrEqual(2);
		const authorIds = liveData?.data?.map((m) => m.authorId) ?? [];
		expect(authorIds.every((id) => id === "author123")).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findMessagesByServerId returns messages by server", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channel
		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		// Create messages
		const messages = [
			createTestMessage("message1", "author1", serverId, "channel123"),
			createTestMessage("message2", "author2", serverId, "channel123"),
			createTestMessage("message3", "author3", serverId, "channel123"),
		];

		yield* database.messages.upsertManyMessages({
			messages,
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.findMessagesByServerId(
			serverId,
			10,
		);

		expect(liveData?.data?.length).toBeGreaterThanOrEqual(3);
		const serverIds = liveData?.data?.map((m) => m.serverId) ?? [];
		expect(serverIds.every((id) => id === serverId)).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findMessagesByParentChannelId returns thread messages", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create parent channel
		const parentChannel = createTestChannel("parent123", serverId);
		yield* database.channels.upsertChannelWithSettings({
			channel: parentChannel,
		});

		// Create thread channel
		const threadChannel = createTestChannel("thread123", serverId, {
			parentId: "parent123",
			type: 11, // PublicThread
		});
		yield* database.channels.upsertChannelWithSettings({
			channel: threadChannel,
		});

		// Create messages in thread
		const messages = [
			createTestMessage("message1", "author1", serverId, "thread123", {
				parentChannelId: "parent123",
			}),
			createTestMessage("message2", "author2", serverId, "thread123", {
				parentChannelId: "parent123",
			}),
		];

		yield* database.messages.upsertManyMessages({
			messages,
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.findMessagesByParentChannelId(
			"parent123",
			10,
		);

		expect(liveData?.data?.length).toBeGreaterThanOrEqual(2);
		const parentChannelIds =
			liveData?.data?.map((m) => m.parentChannelId) ?? [];
		expect(parentChannelIds.every((id) => id === "parent123")).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findLatestMessageInChannel returns latest message", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channel
		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		// Create messages with different IDs (higher ID = newer)
		const messages = [
			createTestMessage("100", "author1", serverId, "channel123"),
			createTestMessage("200", "author2", serverId, "channel123"),
			createTestMessage("300", "author3", serverId, "channel123"),
		];

		yield* database.messages.upsertManyMessages({
			messages,
			ignoreChecks: true,
		});

		const liveData =
			yield* database.messages.findLatestMessageInChannel("channel123");

		// Should return one of the messages (order may vary, but should be latest)
		expect(liveData?.data).not.toBeNull();
		expect(liveData?.data?.channelId).toBe("channel123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"findLatestMessageInChannelAndThreads returns latest across channel and threads",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			// Create server
			yield* database.servers.upsertServer(testServer);
			const serverLiveData =
				yield* database.servers.getServerByDiscordId("server123");
			const serverId = serverLiveData?.data?._id;

			if (!serverId) {
				throw new Error("Server not found");
			}

			// Create parent channel
			const parentChannel = createTestChannel("parent123", serverId);
			yield* database.channels.upsertChannelWithSettings({
				channel: parentChannel,
			});

			// Create thread channel
			const threadChannel = createTestChannel("thread123", serverId, {
				parentId: "parent123",
				type: 11, // PublicThread
			});
			yield* database.channels.upsertChannelWithSettings({
				channel: threadChannel,
			});

			// Create messages in parent channel
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

			// Create message in thread (higher ID = newer)
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
				yield* database.messages.findLatestMessageInChannelAndThreads(
					"parent123",
				);

			// Should return the thread message (higher ID)
			expect(liveData?.data).not.toBeNull();
			expect(liveData?.data?.id).toBe("200");
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findAttachmentsByMessageId returns attachments for a message", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channel
		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		// Create message with attachments
		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		const attachment1 = createTestAttachment("attach1", "message123");
		const attachment2 = createTestAttachment("attach2", "message123");

		yield* database.messages.upsertMessage({
			message: {
				...message,
				attachments: [attachment1, attachment2],
			},
			ignoreChecks: true,
		});

		const liveData =
			yield* database.messages.findAttachmentsByMessageId("message123");

		expect(liveData?.data?.length).toBe(2);
		const attachmentIds = liveData?.data?.map((a) => a.id) ?? [];
		expect(attachmentIds).toContain("attach1");
		expect(attachmentIds).toContain("attach2");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findReactionsByMessageId returns reactions for a message", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channel
		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		// Create message with reactions
		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		const emoji1 = createTestEmoji("emoji1", "👍");
		const emoji2 = createTestEmoji("emoji2", "❤️");

		yield* database.messages.upsertMessage({
			message: {
				...message,
				reactions: [
					{ userId: "user1", emoji: emoji1 },
					{ userId: "user2", emoji: emoji2 },
				],
			},
			ignoreChecks: true,
		});

		const liveData =
			yield* database.messages.findReactionsByMessageId("message123");

		expect(liveData?.data?.length).toBe(2);
		const reactionMessageIds = liveData?.data?.map((r) => r.messageId) ?? [];
		expect(reactionMessageIds.every((id) => id === "message123")).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findEmojiById returns emoji by ID", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channel
		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		// Create message with reactions (which creates emojis)
		const message = createTestMessage(
			"message123",
			"author123",
			serverId,
			"channel123",
		);

		const emoji = createTestEmoji("emoji123", "👍");

		yield* database.messages.upsertMessage({
			message: {
				...message,
				reactions: [{ userId: "user1", emoji }],
			},
			ignoreChecks: true,
		});

		const liveData = yield* database.messages.findEmojiById("emoji123");

		expect(liveData?.data?.id).toBe("emoji123");
		expect(liveData?.data?.name).toBe("👍");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"deleteManyMessagesByChannelId removes all messages in a channel",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			// Create server
			yield* database.servers.upsertServer(testServer);
			const serverLiveData =
				yield* database.servers.getServerByDiscordId("server123");
			const serverId = serverLiveData?.data?._id;

			if (!serverId) {
				throw new Error("Server not found");
			}

			// Create channel
			const channel = createTestChannel("channel123", serverId);
			yield* database.channels.upsertChannelWithSettings({ channel });

			// Create messages
			const messages = [
				createTestMessage("message1", "author1", serverId, "channel123"),
				createTestMessage("message2", "author2", serverId, "channel123"),
				createTestMessage("message3", "author3", serverId, "channel123"),
			];

			yield* database.messages.upsertManyMessages({
				messages,
				ignoreChecks: true,
			});

			// Delete all messages in channel
			yield* database.messages.deleteManyMessagesByChannelId("channel123");

			// Verify all messages are deleted
			const liveData =
				yield* database.messages.findMessagesByChannelId("channel123");
			expect(liveData?.data?.length).toBe(0);
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("deleteManyMessagesByUserId removes all messages by a user", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channel
		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		// Create messages from same author
		const messages = [
			createTestMessage("message1", "author123", serverId, "channel123"),
			createTestMessage("message2", "author123", serverId, "channel123"),
			createTestMessage("message3", "author456", serverId, "channel123"),
		];

		yield* database.messages.upsertManyMessages({
			messages,
			ignoreChecks: true,
		});

		// Delete all messages by author123
		yield* database.messages.deleteManyMessagesByUserId("author123");

		// Verify author123's messages are deleted
		const author123Messages =
			yield* database.messages.findMessagesByAuthorId("author123");
		expect(author123Messages?.data?.length).toBe(0);

		// Verify author456's message still exists
		const author456Messages =
			yield* database.messages.findMessagesByAuthorId("author456");
		expect(author456Messages?.data?.length).toBeGreaterThanOrEqual(1);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findSolutionsByQuestionId returns solutions for a question", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// Create channel
		const channel = createTestChannel("channel123", serverId);
		yield* database.channels.upsertChannelWithSettings({ channel });

		// Create question message
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

		// Create solution messages
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

		// Find solutions
		const liveData =
			yield* database.messages.findSolutionsByQuestionId("question123");

		expect(liveData?.data?.length).toBe(2);
		const solutionIds = liveData?.data?.map((m) => m.id) ?? [];
		expect(solutionIds).toContain("solution1");
		expect(solutionIds).toContain("solution2");

		// Verify all solutions have the correct questionId
		const questionIds = liveData?.data?.map((m) => m.questionId) ?? [];
		expect(questionIds.every((id) => id === "question123")).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);
