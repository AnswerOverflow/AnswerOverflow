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
      "Message not found"
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
    let thread: Channel;
    let threadMessages: Message[];
    beforeEach(async () => {
      thread = mockThread(channel);
      const startId = thread.id;
      const nextId = randomSnowflakeLargerThan(startId).toString();
      const lastId = randomSnowflakeLargerThan(nextId).toString();
      threadMessages = [
        mockMessage(server, thread, author, {
          id: startId,
        }),
        mockMessage(server, thread, author, {
          id: nextId,
        }),
        mockMessage(server, thread, author, {
          id: lastId,
        }),
      ];

      await createChannel(thread);
      await upsertManyMessages(threadMessages);
    });

    it("should get all thread messages for a thread correctly starting from the root", async () => {
      const messages = await unauthedMessagePageRouter.byId(threadMessages[0]!.id);
      expect(messages).toMatchObject({
        messages: threadMessages.map((m) =>
          toPrivateMessageWithStrippedData(
            toMessageWithAccountAndRepliesTo({
              message: m,
              author,
              publicMessage: false,
            })
          )
        ),
        parentChannel: pickPublicChannelData(channel),
        server: pickPublicServerData(server),
        thread: pickPublicChannelData(thread),
      });
    });
    it("should get all thread messages for a thread correctly starting from a message in the thread", async () => {
      const messages = await unauthedMessagePageRouter.byId(
        threadMessages[threadMessages.length - 1]!.id
      );
      expect(messages).toMatchObject({
        messages: threadMessages.map((m) =>
          toPrivateMessageWithStrippedData(
            toMessageWithAccountAndRepliesTo({
              message: m,
              author,
              publicMessage: false,
            })
          )
        ),
        parentChannel: pickPublicChannelData(channel),
        server: pickPublicServerData(server),
        thread: pickPublicChannelData(thread),
      });
    });
  });
});
