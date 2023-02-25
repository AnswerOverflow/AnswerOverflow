import {
  Channel,
  DiscordAccount,
  Message,
  Server,
  createServer,
  createChannel,
  createDiscordAccount,
  upsertManyMessages,
} from "@answeroverflow/db";
import { mockUnauthedCtx } from "~api/test/utils";
import { messagePageRouter } from "./message-page";
import {
  pickPublicServerData,
  toMessageWithAccountAndRepliesTo,
  toPrivateMessageWithStrippedData,
} from "~api/test/public-data";
import {
  mockServer,
  mockChannel,
  mockDiscordAccount,
  mockMessage,
  mockThread,
} from "@answeroverflow/db-mock";
import { getRandomId } from "@answeroverflow/utils";
import { randomSnowflakeLargerThan } from "@answeroverflow/discordjs-utils";
import { pickPublicChannelData } from "../channel/channel.test";
import { ChannelType } from "discord-api-types/v10";

let server: Server;
let channel: Channel;
let author: DiscordAccount;
let unauthedMessagePageRouter: ReturnType<(typeof messagePageRouter)["createCaller"]>;

beforeEach(async () => {
  server = mockServer();
  channel = mockChannel(server);
  author = mockDiscordAccount();

  await createServer(server);
  await createChannel(channel);
  await createDiscordAccount(author);
  const unauthedCtx = await mockUnauthedCtx("web-client");
  unauthedMessagePageRouter = messagePageRouter.createCaller(unauthedCtx);
});

describe("Message Results", () => {
  it("should 404 if the root message doesnt exists", async () => {
    await expect(unauthedMessagePageRouter.byId(getRandomId())).rejects.toThrow(
      "Target message not found"
    );
  });
  describe("Text Channel Message Pages", () => {
    let message: Message;
    let message2: Message;
    beforeEach(async () => {
      message = mockMessage(server, channel, author);
      message2 = mockMessage(server, channel, author, {
        id: randomSnowflakeLargerThan(message.id).toString(),
      });
      await upsertManyMessages([message, message2]);
    });
    it("should get messages for a text channel correctly", async () => {
      const messages = await unauthedMessagePageRouter.byId(message.id);
      expect(messages).toMatchObject({
        messages: [
          toPrivateMessageWithStrippedData(
            toMessageWithAccountAndRepliesTo({
              message,
              author,
              publicMessage: false,
            })
          ),
          toPrivateMessageWithStrippedData(
            toMessageWithAccountAndRepliesTo({
              message: message2,
              author,
              publicMessage: false,
            })
          ),
        ],
        parentChannel: pickPublicChannelData(channel),
        server: pickPublicServerData(server),
        thread: undefined,
      });
    });
  });
  describe("Thread Message Pages", () => {
    it("should get messages correctly starting from the root of a text channel thread", async () => {
      const thread = mockThread(channel);
      const message = mockMessage(server, channel, author, {
        childThread: thread.id,
        id: thread.id,
      });
      const message2 = mockMessage(server, thread, author, {
        id: randomSnowflakeLargerThan(message.id).toString(),
      });
      await createChannel(thread);
      await upsertManyMessages([message, message2]);
      const pageData = await unauthedMessagePageRouter.byId(message.id);
      expect(pageData.messages).toEqual([
        toPrivateMessageWithStrippedData(
          toMessageWithAccountAndRepliesTo({
            message,
            author,
            publicMessage: false,
          })
        ),
        toPrivateMessageWithStrippedData(
          toMessageWithAccountAndRepliesTo({
            message: message2,
            author,
            publicMessage: false,
          })
        ),
      ]);
      expect(pageData.parentChannel).toEqual(pickPublicChannelData(channel));
      expect(pageData.server).toEqual(pickPublicServerData(server));
      expect(pageData.thread).toEqual(pickPublicChannelData(thread));
    });
    it("should get messages correctly starting a non root message in a text channel thread", async () => {
      const thread = mockThread(channel);
      const message = mockMessage(server, channel, author, {
        childThread: thread.id,
        id: thread.id,
      });
      const message2 = mockMessage(server, thread, author, {
        id: randomSnowflakeLargerThan(message.id).toString(),
        parentChannelId: channel.id,
      });
      await createChannel(thread);
      await upsertManyMessages([message, message2]);
      const pageData = await unauthedMessagePageRouter.byId(message2.id);
      expect(pageData.messages).toEqual([
        toPrivateMessageWithStrippedData(
          toMessageWithAccountAndRepliesTo({
            message: message,
            author,
            publicMessage: false,
          })
        ),
        toPrivateMessageWithStrippedData(
          toMessageWithAccountAndRepliesTo({
            message: message2,
            author,
            publicMessage: false,
          })
        ),
      ]);
      expect(pageData.parentChannel).toEqual(pickPublicChannelData(channel));
      expect(pageData.server).toEqual(pickPublicServerData(server));
      expect(pageData.thread).toEqual(pickPublicChannelData(thread));
    });
    it("should get follow up messages of a text channel correctly", async () => {
      const message = mockMessage(server, channel, author);
      const message2 = mockMessage(server, channel, author, {
        id: randomSnowflakeLargerThan(message.id).toString(),
      });
      await upsertManyMessages([message, message2]);
      const pageData = await unauthedMessagePageRouter.byId(message.id);
      expect(pageData.messages).toEqual([
        toPrivateMessageWithStrippedData(
          toMessageWithAccountAndRepliesTo({
            message,
            author,
            publicMessage: false,
          })
        ),
        toPrivateMessageWithStrippedData(
          toMessageWithAccountAndRepliesTo({
            message: message2,
            author,
            publicMessage: false,
          })
        ),
      ]);
      expect(pageData.parentChannel).toEqual(pickPublicChannelData(channel));
      expect(pageData.server).toEqual(pickPublicServerData(server));
      expect(pageData.thread).toEqual(undefined);
    });
    it("should get follow up messages of a forum post correctly starting from the root of the post", async () => {
      const forumChannel = mockChannel(server, {
        type: ChannelType.GuildForum,
      });
      const forumThread = mockThread(forumChannel);
      await createChannel(forumChannel);
      await createChannel(forumThread);
      const message = mockMessage(server, forumThread, author, {
        id: forumChannel.id,
        parentChannelId: forumChannel.id,
      });
      const message2 = mockMessage(server, forumThread, author, {
        id: randomSnowflakeLargerThan(message.id).toString(),
        parentChannelId: forumChannel.id,
      });
      await upsertManyMessages([message, message2]);
      const pageData = await unauthedMessagePageRouter.byId(message.id);
      expect(pageData.messages).toEqual([
        toPrivateMessageWithStrippedData(
          toMessageWithAccountAndRepliesTo({
            message,
            author,
            publicMessage: false,
          })
        ),
        toPrivateMessageWithStrippedData(
          toMessageWithAccountAndRepliesTo({
            message: message2,
            author,
            publicMessage: false,
          })
        ),
      ]);
      expect(pageData.parentChannel).toEqual(pickPublicChannelData(forumChannel));
      expect(pageData.server).toEqual(pickPublicServerData(server));
      expect(pageData.thread).toEqual(pickPublicChannelData(forumThread));
    });
    it("should get follow up messages of a forum post correctly starting from a non root message", async () => {
      const forumChannel = mockChannel(server, {
        type: ChannelType.GuildForum,
      });
      const forumThread = mockThread(forumChannel);
      await createChannel(forumChannel);
      await createChannel(forumThread);
      const message = mockMessage(server, forumThread, author, {
        id: forumChannel.id,
        parentChannelId: forumChannel.id,
      });
      const message2 = mockMessage(server, forumThread, author, {
        id: randomSnowflakeLargerThan(message.id).toString(),
        parentChannelId: forumChannel.id,
      });
      await upsertManyMessages([message, message2]);
      const pageData = await unauthedMessagePageRouter.byId(message2.id);
      expect(pageData.messages).toEqual([
        toPrivateMessageWithStrippedData(
          toMessageWithAccountAndRepliesTo({
            message,
            author,
            publicMessage: false,
          })
        ),
        toPrivateMessageWithStrippedData(
          toMessageWithAccountAndRepliesTo({
            message: message2,
            author,
            publicMessage: false,
          })
        ),
      ]);
      expect(pageData.parentChannel).toEqual(pickPublicChannelData(forumChannel));
      expect(pageData.server).toEqual(pickPublicServerData(server));
      expect(pageData.thread).toEqual(pickPublicChannelData(forumThread));
    });
  });
});
