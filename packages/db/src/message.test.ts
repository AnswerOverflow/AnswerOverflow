import type { Channel, DiscordAccount, Server } from "@answeroverflow/prisma-types";
import { mockChannel, mockDiscordAccount, mockMessage, mockServer } from "@answeroverflow/db-mock";
import {
  CANNOT_UPSERT_MESSAGE_FOR_IGNORED_ACCOUNT_MESSAGE,
  CANNOT_UPSERT_MESSAGE_FOR_USER_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE,
  deleteManyMessages,
  deleteManyMessagesByChannelId,
  deleteManyMessagesByUserId,
  deleteMessage,
  findMessageById,
  findMessagesByChannelId,
  updateMessage,
  upsertManyMessages,
  upsertMessage,
} from "./message";
import { createServer } from "./server";
import { createChannel } from "./channel";
import { createDiscordAccount, deleteDiscordAccount } from "./discord-account";
import { createUserServerSettings, Message } from "..";

describe("Message Operations", () => {
  let server: Server;
  let channel: Channel;
  let message: Message;
  let author: DiscordAccount;
  beforeEach(async () => {
    server = mockServer();
    channel = mockChannel(server);
    author = mockDiscordAccount();
    message = mockMessage(server, channel, author);
    await createServer(server);
    await createChannel(channel);
    await createDiscordAccount(author);
  });
  describe("Find By Id", () => {
    it("should return a message", async () => {
      await upsertMessage(message);
      const found = await findMessageById(message.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(message.id);
    });
    it("should return a message with its referenced message", async () => {
      const referencedMessage = mockMessage(server, channel, author);
      await upsertMessage(referencedMessage);
      const msg = mockMessage(server, channel, author, {
        messageReference: {
          messageId: referencedMessage.id,
          channelId: referencedMessage.channelId,
          serverId: referencedMessage.serverId,
        },
      });
      await upsertMessage(msg);
      const found = await findMessageById(msg.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(msg.id);
      expect(found?.referencedMessage?.id).toBe(referencedMessage.id);
      expect(found?.referencedMessage?.author).toBe(author);
    });
    it("should return null if message not found", async () => {
      const found = await findMessageById("1");
      expect(found).toBeNull();
    });
  });
  describe("Find By Channel Id", () => {
    beforeEach(async () => {
      const msg2 = mockMessage(server, channel, author);
      const msg3 = mockMessage(server, channel, author);
      await upsertMessage(message);
      await upsertMessage(msg2);
      await upsertMessage(msg3);
    });
    it("should return messages", async () => {
      const found = await findMessagesByChannelId({
        channelId: channel.id,
      });
      expect(found).toHaveLength(3);
    });
    it("should find a limited number of messages", async () => {
      const found = await findMessagesByChannelId({
        channelId: channel.id,
        limit: 2,
      });
      expect(found).toHaveLength(2);
    });
    test.todo("should find messages after a given message id");
  });
  describe("Upsert", () => {
    it("should upsert create a message", async () => {
      await upsertMessage(message);
      const found = await findMessageById(message.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(message.id);
    });
    it("should upsert update a message", async () => {
      await upsertMessage(message);
      const found = await findMessageById(message.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(message.id);
      expect(found?.content).toBe(message.content);
      const updated = { ...message, content: "updated" };
      await upsertMessage(updated);
      const foundUpdated = await findMessageById(message.id);
      expect(foundUpdated).not.toBeNull();
      expect(foundUpdated?.id).toBe(message.id);
      expect(foundUpdated?.content).toBe(updated.content);
    });
    it("should fail to upsert a message with an ignored account", async () => {
      await deleteDiscordAccount(author.id);
      const ignoredMessage = mockMessage(server, channel, author);
      await expect(upsertMessage(ignoredMessage)).rejects.toThrowError(
        CANNOT_UPSERT_MESSAGE_FOR_IGNORED_ACCOUNT_MESSAGE
      );
    });
    it("should fail to upsert a message for a user with message indexing disabled", async () => {
      await createUserServerSettings({
        userId: author.id,
        serverId: server.id,
        flags: {
          messageIndexingDisabled: true,
        },
      });
      await expect(upsertMessage(message)).rejects.toThrowError(
        CANNOT_UPSERT_MESSAGE_FOR_USER_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE
      );
    });
  });
  describe("Update", () => {
    it("should update a message", async () => {
      await upsertMessage(message);
      const found = await findMessageById(message.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(message.id);
      expect(found?.content).toBe(message.content);
      const updated = { ...message, content: "updated" };
      await upsertMessage(updated);
      const foundUpdated = await findMessageById(message.id);
      expect(foundUpdated).not.toBeNull();
      expect(foundUpdated?.id).toBe(message.id);
      expect(foundUpdated?.content).toBe(updated.content);
    });
    it("should fail to update a message that does not exist returning null", async () => {
      await expect(updateMessage(message)).resolves.toBeNull();
    });
  });
  describe("Upsert Many Messages", () => {
    it("should upsert many messages", async () => {
      const msg2 = mockMessage(server, channel, author);
      const msg3 = mockMessage(server, channel, author);
      await upsertManyMessages([message, msg2, msg3]);
      const found = await findMessagesByChannelId({
        channelId: channel.id,
      });
      expect(found).toHaveLength(3);
    });
    it("should only upsert messages for non-ignored accounts", async () => {
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
    it("should return 0 if no messages are upserted", async () => {
      await expect(upsertManyMessages([])).resolves.toBe(true);
    });
    it("should only upsert messages for users with message indexing enabled", async () => {
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
  describe("Delete Messages", () => {
    it("should delete a message", async () => {
      await upsertMessage(message);
      const found = await findMessageById(message.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(message.id);
      const deleteResult = await deleteMessage(message.id);
      expect(deleteResult).toBe(true);
      const foundDeleted = await findMessageById(message.id);
      expect(foundDeleted).toBeNull();
    });
    it("should fail to delete a message that does not exist returning null", async () => {
      await expect(deleteMessage(message.id)).resolves.toBeFalsy();
    });
  });
  describe("Delete Many Messages By Id", () => {
    it("should delete many messages", async () => {
      const msg2 = mockMessage(server, channel, author);
      const msg3 = mockMessage(server, channel, author);
      await upsertMessage(message);
      await upsertMessage(msg2);
      await upsertMessage(msg3);
      const found = await findMessagesByChannelId({
        channelId: channel.id,
      });
      expect(found).toHaveLength(3);
      const deleteResult = await deleteManyMessages([message.id, msg2.id, msg3.id]);
      expect(deleteResult).toBe(true);
      const foundDeleted = await findMessagesByChannelId({
        channelId: channel.id,
      });
      expect(foundDeleted).toHaveLength(0);
    });
  });
  describe("Delete Many Messages By Channel Id", () => {
    it("should delete many messages", async () => {
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
  describe("Delete Many Messages By User Id", () => {
    it("should delete many messages", async () => {
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
});
