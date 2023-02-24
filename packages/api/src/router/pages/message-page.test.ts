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
  });
});
