import { Channel, clearDatabase, DiscordAccount, Message, Server } from "@answeroverflow/db";
import {
  createAnswerOverflowBotCtx,
  mockAccount,
  mockChannel,
  mockMessage,
  mockServer,
  mockThread,
  mockUnauthedCtx,
} from "~api/test/utils";
import { channelRouter } from "../channel/channel";
import { serverRouter } from "../server/server";
import { discordAccountRouter } from "../users/accounts/discord-accounts";
import { messageRouter } from "../message/message";
import { message_page_router } from "./message-page";
import {
  pickPublicServerData,
  toMessageWithDiscordAccount,
  toPrivateMessageWithStrippedData,
} from "~api/test/public_data";

let server: Server;
let channel: Channel;
let author: DiscordAccount;
let ao_bot_channel_router: ReturnType<(typeof channelRouter)["createCaller"]>;
let ao_bot_server_router: ReturnType<(typeof serverRouter)["createCaller"]>;
let ao_bot_discord_account_router: ReturnType<(typeof discordAccountRouter)["createCaller"]>;
let ao_bot_message_router: ReturnType<(typeof messageRouter)["createCaller"]>;
let unauthed_message_page_router: ReturnType<(typeof message_page_router)["createCaller"]>;

beforeEach(async () => {
  await clearDatabase();
  server = mockServer();
  channel = mockChannel(server);
  author = mockAccount();

  const ao_bot = await createAnswerOverflowBotCtx();
  ao_bot_server_router = serverRouter.createCaller(ao_bot);
  ao_bot_channel_router = channelRouter.createCaller(ao_bot);
  ao_bot_discord_account_router = discordAccountRouter.createCaller(ao_bot);
  ao_bot_message_router = messageRouter.createCaller(ao_bot);
  await ao_bot_server_router.create(server);
  await ao_bot_channel_router.create(channel);
  await ao_bot_discord_account_router.create(author);
  const unauthed_ctx = await mockUnauthedCtx("web-client");
  unauthed_message_page_router = message_page_router.createCaller(unauthed_ctx);
});

describe("Message Results", () => {
  it("should 404 if the root message doesnt exists", async () => {
    await expect(unauthed_message_page_router.byId("123")).rejects.toThrow("Message not found");
  });
  describe("Text Channel Message Pages", () => {
    let message: Message;
    let message2: Message;
    beforeEach(async () => {
      message = mockMessage(server, channel, author, {
        id: "1",
      });
      message2 = mockMessage(server, channel, author, {
        id: "2",
      });
      await ao_bot_message_router.upsertBulk([message, message2]);
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
      thread_messages = [
        mockMessage(server, thread, author, {
          id: "1",
        }),
        mockMessage(server, thread, author, {
          id: "2",
        }),
        mockMessage(server, thread, author, {
          id: "3",
        }),
      ];
      await ao_bot_channel_router.create(thread);
      await ao_bot_message_router.upsertBulk(thread_messages);
    });

    it("should get all thread messages for a thread correctly starting from the root", async () => {
      const messages = await unauthed_message_page_router.byId("1");
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
      const messages = await unauthed_message_page_router.byId("3");
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
