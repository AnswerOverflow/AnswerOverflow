import { Channel, clearDatabase, DiscordAccount, Message, Server } from "@answeroverflow/db";
import {
  createAnswerOverflowBotCtx,
  mockAccount,
  mockChannel,
  mockMessage,
  mockServer,
  mockUnauthedCtx,
} from "~api/test/utils";
import { channelRouter } from "../channel/channel";
import { serverRouter } from "../server/server";
import { discordAccountRouter } from "../users/accounts/discord-accounts";
import { messageRouter } from "../message/message";
import { message_page_router } from "./message-result";
import { pickPublicServerData } from "~api/test/public_data";

let server: Server;
let channel: Channel;
let author: DiscordAccount;
let message: Message;
let message2: Message;
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
  message = mockMessage(server, channel, author);
  message2 = mockMessage(server, channel, author);
  const ao_bot = await createAnswerOverflowBotCtx();
  ao_bot_server_router = serverRouter.createCaller(ao_bot);
  ao_bot_channel_router = channelRouter.createCaller(ao_bot);
  ao_bot_discord_account_router = discordAccountRouter.createCaller(ao_bot);
  ao_bot_message_router = messageRouter.createCaller(ao_bot);
  await ao_bot_server_router.create(server);
  await ao_bot_channel_router.create(channel);
  await ao_bot_discord_account_router.create(author);
  await ao_bot_message_router.upsertBulk([message, message2]);
  const unauthed_ctx = await mockUnauthedCtx("web-client");
  unauthed_message_page_router = message_page_router.createCaller(unauthed_ctx);
});

describe("Message Results", () => {
  it("should 404 if the root message doesnt exists", async () => {
    await expect(unauthed_message_page_router.byId("123")).rejects.toThrow("Message not found");
  });
  // it("should get all thread messages for a text channel correctly", async () => {
  //   const messages = await unauthed_message_page_router.byId(message.id);
  //   expect(messages).toMatchObject({
  //     messages: [message, message2],
  //     parent_channel: channel,
  //     server: pickPublicServerData(server),
  //     thread: undefined,
  //   });
  // });
  it("should get all thread messages for a forum channel correctly", async () => {});
  it("should get the next 10 messages in a text channel", async () => {});
});
