import {
  Channel,
  DiscordAccount,
  Message,
  Server,
  prisma,
  elastic,
  createServer,
  createChannel,
  createDiscordAccount,
  upsertManyMessages,
} from "@answeroverflow/db";
import { mockUnauthedCtx } from "~api/test/utils";
import { message_page_router } from "./message-page";
import {
  pickPublicServerData,
  toMessageWithDiscordAccount,
  toPrivateMessageWithStrippedData,
} from "~api/test/public_data";
import {
  mockServer,
  mockChannel,
  mockAccount,
  mockMessage,
  mockThread,
} from "@answeroverflow/db-mock";
import { getRandomId } from "@answeroverflow/utils";
import { randomSnowflakeLargerThan } from "@answeroverflow/discordjs-utils";

let server: Server;
let channel: Channel;
let author: DiscordAccount;
let unauthed_message_page_router: ReturnType<(typeof message_page_router)["createCaller"]>;

beforeEach(async () => {
  server = mockServer();
  channel = mockChannel(server);
  author = mockAccount();

  await createServer(server, prisma);
  await createChannel(channel, prisma);
  await createDiscordAccount(author, prisma);
  const unauthed_ctx = await mockUnauthedCtx("web-client");
  unauthed_message_page_router = message_page_router.createCaller(unauthed_ctx);
});

describe("Message Results", () => {
  it("should 404 if the root message doesnt exists", async () => {
    await expect(unauthed_message_page_router.byId(getRandomId())).rejects.toThrow(
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
      await upsertManyMessages([message, message2], elastic, prisma);
    });
    it("should get messages for a text channel correctly", async () => {
      const messages = await unauthed_message_page_router.byId(message.id);
      expect(messages).toMatchObject({
        messages: [
          toPrivateMessageWithStrippedData(toMessageWithDiscordAccount(message, author, false)),
          toPrivateMessageWithStrippedData(toMessageWithDiscordAccount(message2, author, false)),
        ],
        parent_channel: channel,
        server: pickPublicServerData(server),
        thread: undefined,
      });
    });
  });
  describe("Thread Message Pages", () => {
    let thread: Channel;
    let thread_messages: Message[];
    beforeEach(async () => {
      thread = mockThread(channel);
      const start_id = thread.id;
      const next_id = randomSnowflakeLargerThan(start_id).toString();
      const last_id = randomSnowflakeLargerThan(next_id).toString();
      thread_messages = [
        mockMessage(server, thread, author, {
          id: start_id,
        }),
        mockMessage(server, thread, author, {
          id: next_id,
        }),
        mockMessage(server, thread, author, {
          id: last_id,
        }),
      ];

      await createChannel(thread, prisma);
      await upsertManyMessages(thread_messages, elastic, prisma);
    });

    it("should get all thread messages for a thread correctly starting from the root", async () => {
      const messages = await unauthed_message_page_router.byId(thread_messages[0]!.id);
      expect(messages).toMatchObject({
        messages: thread_messages.map((m) =>
          toPrivateMessageWithStrippedData(toMessageWithDiscordAccount(m, author, false))
        ),
        parent_channel: channel,
        server: pickPublicServerData(server),
        thread,
      });
    });
    it("should get all thread messages for a thread correctly starting from a message in the thread", async () => {
      const messages = await unauthed_message_page_router.byId(
        thread_messages[thread_messages.length - 1]!.id
      );
      expect(messages).toMatchObject({
        messages: thread_messages.map((m) =>
          toPrivateMessageWithStrippedData(toMessageWithDiscordAccount(m, author, false))
        ),
        parent_channel: channel,
        server: pickPublicServerData(server),
        thread,
      });
    });
  });
});
