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
  toMessageWithAccountAndRepliesTo,
  toPrivateMessageWithStrippedData,
} from "~api/test/public-data";
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
    let publicAuthor: DiscordAccount;
    let privateAuthor: DiscordAccount;
    let privateMessage: Message;
    let publicMessage: Message;
    beforeEach(async () => {
      publicAuthor = mockDiscordAccount();
      privateAuthor = mockDiscordAccount();
      await createDiscordAccount(publicAuthor);
      await createDiscordAccount(privateAuthor);
      await createUserServerSettings({
        serverId: server.id,
        userId: publicAuthor.id,
        flags: {
          canPubliclyDisplayMessages: true,
        },
      });
      await createUserServerSettings({
        serverId: server.id,
        userId: privateAuthor.id,
        flags: {
          canPubliclyDisplayMessages: false,
        },
      });
      publicMessage = mockMessage(server, channel, publicAuthor);
      privateMessage = mockMessage(server, channel, privateAuthor, {
        id: randomSnowflakeLargerThan(publicMessage.id).toString(),
      });
      await upsertManyMessages([publicMessage, privateMessage]);
    });
    it("should get all messages with private data if users share a server", async () => {
      const { ctx } = await mockAccountWithServersCallerCtx(server, "web-client");
      const router = messageRouter.createCaller(ctx);
      const messages = await router.byChannelIdBulk({
        channelId: channel.id,
      });
      expect(messages).toEqual([
        toMessageWithAccountAndRepliesTo({
          message: publicMessage,
          author: publicAuthor,
          publicMessage: true,
        }),
        toMessageWithAccountAndRepliesTo({
          message: privateMessage,
          author: privateAuthor,
          publicMessage: false,
        }),
      ]);
    });
    it("should get all messages with only public data if users do not share a server", async () => {
      const { ctx } = await mockAccountCallerCtx("web-client");
      const router = messageRouter.createCaller(ctx);
      const messages = await router.byChannelIdBulk({
        channelId: channel.id,
      });

      expect(messages).toEqual([
        toMessageWithAccountAndRepliesTo({
          message: publicMessage,
          author: publicAuthor,
          publicMessage: true,
        }),
        toPrivateMessageWithStrippedData(
          toMessageWithAccountAndRepliesTo({
            message: privateMessage,
            author: privateAuthor,
            publicMessage: false,
          })
        ),
      ]);
    });
  });
});

describe("Message Utilities", () => {
  describe("Strip Private Message Data", () => {
    it("should preserve information on a public message", () => {
      const author = mockDiscordAccount();
      const messageWithAccount = toMessageWithAccountAndRepliesTo({
        message: mockMessage(server, channel, author),
        author,
        publicMessage: true,
      });
      const stripped = stripPrivateMessageData(messageWithAccount);
      expect(stripped).toEqual(messageWithAccount);
    });
    it("should strip information on a private message", () => {
      const author = mockDiscordAccount();

      const messageWithAccount = toMessageWithAccountAndRepliesTo({
        message: mockMessage(server, channel, author),
        author,
        publicMessage: false,
      });
      const stripped = stripPrivateMessageData(messageWithAccount);
      expect(stripped).toEqual(toPrivateMessageWithStrippedData(messageWithAccount));
    });
  });
});
