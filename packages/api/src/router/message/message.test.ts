import {
  Channel,
  createChannel,
  createDiscordAccount,
  createServer,
  createUserServerSettings,
  DiscordAccount,
  Message,
  Server,
  upsertManyMessages,
} from "@answeroverflow/db";
import { mockAccountCallerCtx, mockAccountWithServersCallerCtx } from "~api/test/utils";
import { messageRouter, stripPrivateMessageData } from "./message";
import {
  toMessageWithDiscordAccount,
  toPrivateMessageWithStrippedData,
} from "~api/test/public_data";
import { mockDiscordAccount, mockChannel, mockMessage, mockServer } from "@answeroverflow/db-mock";
import { randomSnowflakeLargerThan } from "@answeroverflow/discordjs-utils";

let server: Server;
let channel: Channel;
let author: DiscordAccount;

beforeEach(async () => {
  server = mockServer();
  channel = mockChannel(server);
  author = mockDiscordAccount();
  await createServer(server);
  await createChannel(channel);
  await createDiscordAccount(author);
});

describe("Message Operations", () => {
  describe("Message By Id Bulk", () => {
    test.todo("by id bulk fetching");
  });
  describe("Message By Channel Id Bulk", () => {
    let public_author: DiscordAccount;
    let private_author: DiscordAccount;
    let private_message: Message;
    let public_message: Message;
    beforeEach(async () => {
      public_author = mockDiscordAccount();
      private_author = mockDiscordAccount();
      await createDiscordAccount(public_author);
      await createDiscordAccount(private_author);
      await createUserServerSettings({
        server_id: server.id,
        user_id: public_author.id,
        flags: {
          can_publicly_display_messages: true,
        },
      });
      await createUserServerSettings({
        server_id: server.id,
        user_id: private_author.id,
        flags: {
          can_publicly_display_messages: false,
        },
      });
      public_message = mockMessage(server, channel, public_author);
      private_message = mockMessage(server, channel, private_author, {
        id: randomSnowflakeLargerThan(public_message.id).toString(),
      });
      await upsertManyMessages([public_message, private_message]);
    });
    it("should get all messages with private data if users share a server", async () => {
      const { ctx } = await mockAccountWithServersCallerCtx(server, "web-client");
      const message_router = messageRouter.createCaller(ctx);
      const messages = await message_router.byChannelIdBulk({
        channel_id: channel.id,
      });
      expect(messages).toEqual([
        toMessageWithDiscordAccount(public_message, public_author, true),
        toMessageWithDiscordAccount(private_message, private_author, false),
      ]);
    });
    it("should get all messages with only public data if users do not share a server", async () => {
      const { ctx } = await mockAccountCallerCtx("web-client");
      const message_router = messageRouter.createCaller(ctx);
      const messages = await message_router.byChannelIdBulk({
        channel_id: channel.id,
      });

      expect(messages).toEqual([
        toMessageWithDiscordAccount(public_message, public_author, true),
        toPrivateMessageWithStrippedData(
          toMessageWithDiscordAccount(private_message, private_author, false)
        ),
      ]);
    });
  });
});

describe("Message Utilities", () => {
  describe("Strip Private Message Data", () => {
    it("should preserve information on a public message", () => {
      const author = mockDiscordAccount();
      const message_with_account = toMessageWithDiscordAccount(
        mockMessage(server, channel, author),
        author,
        true
      );
      const stripped = stripPrivateMessageData(message_with_account);
      expect(stripped).toEqual(message_with_account);
    });
    it("should strip information on a private message", () => {
      const author = mockDiscordAccount();

      const message_with_account = toMessageWithDiscordAccount(
        mockMessage(server, channel, author),
        author,
        false
      );
      const stripped = stripPrivateMessageData(message_with_account);
      expect(stripped).toEqual(toPrivateMessageWithStrippedData(message_with_account));
    });
  });
});
