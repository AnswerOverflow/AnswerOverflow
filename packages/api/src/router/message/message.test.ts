import { Channel, clearDatabase, DiscordAccount, Message, Server } from "@answeroverflow/db";
import {
  createAnswerOverflowBotCtx,
  mockAccount,
  mockAccountWithServersCallerCtx,
  mockChannel,
  mockMessage,
  mockServer,
  testAllDataVariants,
  testAllVariants,
} from "~api/test/utils";
import { channelRouter } from "../channel/channel";
import { serverRouter } from "../server/server";
import { discordAccountRouter } from "../users/accounts/discord-accounts";
import {
  IGNORED_ACCOUNT_MESSAGE,
  ignored_discord_account_router,
} from "../users/ignored-discord-accounts/ignored-discord-account";
import { messageRouter } from "./message";

let server: Server;
let channel: Channel;
let author: DiscordAccount;
let message: Message;
let message2: Message;
let ao_bot_channel_router: ReturnType<(typeof channelRouter)["createCaller"]>;
let ao_bot_server_router: ReturnType<(typeof serverRouter)["createCaller"]>;
let ao_bot_discord_account_router: ReturnType<(typeof discordAccountRouter)["createCaller"]>;
let ao_bot_ignored_account_router: ReturnType<
  (typeof ignored_discord_account_router)["createCaller"]
>;
let ao_bot_message_router: ReturnType<(typeof messageRouter)["createCaller"]>;
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
  ao_bot_ignored_account_router = ignored_discord_account_router.createCaller(ao_bot);
  ao_bot_message_router = messageRouter.createCaller(ao_bot);
  await ao_bot_server_router.create(server);
  await ao_bot_channel_router.create(channel);
  await ao_bot_discord_account_router.create(author);
});

describe("Message Operations", () => {
  describe("Message By Id", () => {
    beforeEach(async () => {
      await ao_bot_message_router.upsert(message);
    });
    it("should get a message by id as the ao bot", async () => {
      const result = await ao_bot_message_router.byId(message.id);
      expect(result).toEqual(message);
    });
    it("should try all varaints of getting a message by id that the author does not own", async () => {
      await testAllDataVariants({
        async fetch({ permission, source }) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source, permission);
          const message_router = messageRouter.createCaller(ctx);
          const data = await message_router.byId(message.id);
          return {
            data,
            private_data_format: message,
            public_data_format: message,
          };
        },
      });
    });
    it("should try all varaints of getting a message by id that the author does own", async () => {
      await testAllDataVariants({
        async fetch({ permission, source }) {
          const { ctx, account } = await mockAccountWithServersCallerCtx(
            server,
            source,
            permission
          );
          const msg = mockMessage(server, channel, account);
          await ao_bot_message_router.upsert(msg);
          const message_router = messageRouter.createCaller(ctx);
          const data = await message_router.byId(msg.id);
          return {
            data,
            private_data_format: msg,
            public_data_format: msg,
          };
        },
      });
    });
  });
  describe("Message By Id Bulk", () => {
    beforeEach(async () => {
      await ao_bot_message_router.upsertBulk([message, message2]);
    });
    it("should get a bulk messages by id as the ao bot", async () => {
      const result = await ao_bot_message_router.byIdBulk([message.id, message2.id]);
      expect(result).toEqual([message, message2]);
    });
    it("should try all varaints of getting a messages by id that the author does not own", async () => {
      await testAllDataVariants({
        async fetch(input) {
          const { ctx } = await mockAccountWithServersCallerCtx(
            server,
            input.source,
            input.permission
          );
          const message_router = messageRouter.createCaller(ctx);
          const data = await message_router.byIdBulk([message.id, message2.id]);
          return {
            data,
            private_data_format: [message, message2],
            public_data_format: [message, message2],
          };
        },
      });
    });
    it("should try all varaints of getting a message by id that the author does own", async () => {
      await testAllDataVariants({
        async fetch({ permission, source }) {
          const { ctx, account } = await mockAccountWithServersCallerCtx(
            server,
            source,
            permission
          );
          const msg = mockMessage(server, channel, account);
          const msg2 = mockMessage(server, channel, account);
          await ao_bot_message_router.upsertBulk([msg, msg2]);
          const message_router = messageRouter.createCaller(ctx);
          const data = await message_router.byIdBulk([msg.id, msg2.id]);
          return {
            data,
            private_data_format: [msg, msg2],
            public_data_format: [msg, msg2],
          };
        },
      });
    });
  });
  describe("Message Update", () => {
    beforeEach(async () => {
      await ao_bot_message_router.upsert(message);
    });
    it("should update a message as the ao bot", async () => {
      const new_content = "new content";
      const result = await ao_bot_message_router.update({
        ...message,
        content: new_content,
      });
      expect(result).toEqual({ ...message, content: new_content });
    });
    it("should fail trying all varaints of updating a message that the author does not own", async () => {
      await testAllVariants({
        async operation(source, permission) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source, permission);
          const message_router = messageRouter.createCaller(ctx);
          await expect(message_router.update(message)).rejects.toThrowError();
        },
        permissionsThatShouldWork: [],
        sourcesThatShouldWork: [],
      });
    });
    it("should fail trying all varaints of updating a message that the author does own", async () => {
      await testAllVariants({
        async operation(source, permission) {
          const { ctx, account } = await mockAccountWithServersCallerCtx(
            server,
            source,
            permission
          );
          const message_router = messageRouter.createCaller(ctx);
          const msg = mockMessage(server, channel, account);
          await expect(message_router.update(msg)).rejects.toThrowError();
        },
        permissionsThatShouldWork: [],
        sourcesThatShouldWork: [],
      });
    });
  });
  describe("Message Upsert", () => {
    describe("Message Upsert Create", () => {
      it("should upsert create a message as the ao bot", async () => {
        const result = await ao_bot_message_router.upsert(message);
        expect(result).toEqual(message);
      });
      it("should fail creating a message of an ignored user as the ao bot", async () => {
        const ignored = mockAccount();
        await ao_bot_ignored_account_router.upsert(ignored.id);
        const msg = mockMessage(server, channel, ignored);
        await expect(ao_bot_message_router.upsert(msg)).rejects.toThrowError(
          IGNORED_ACCOUNT_MESSAGE
        );
        await expect(ao_bot_message_router.byId(msg.id)).rejects.toThrowError();
      });
      it("should fail trying all varaints of upsert creating a message that the author does not own", async () => {
        await testAllVariants({
          async operation(source, permission) {
            const { ctx } = await mockAccountWithServersCallerCtx(server, source, permission);
            const message_router = messageRouter.createCaller(ctx);
            await expect(message_router.upsert(message)).rejects.toThrowError();
          },
        });
      });
      it("should fail try all varaints of upsert creating a message that the author does own", async () => {
        await testAllVariants({
          async operation(source, permission) {
            const { ctx, account } = await mockAccountWithServersCallerCtx(
              server,
              source,
              permission
            );
            const message_router = messageRouter.createCaller(ctx);
            const msg = mockMessage(server, channel, account);
            await expect(message_router.upsert(msg)).rejects.toThrowError();
          },
        });
      });
    });
    describe("Message Upsert Update", () => {
      beforeEach(async () => {
        await ao_bot_message_router.upsert(message);
      });
      it("should upsert update a message as the ao bot", async () => {
        const new_content = "new content";
        const result = await ao_bot_message_router.upsert({
          ...message,
          content: new_content,
        });
        expect(result).toEqual({ ...message, content: new_content });
      });
      it("should fail trying all varaints of upsert updating a message that the author does not own", async () => {
        await testAllVariants({
          async operation(source, permission) {
            const { ctx } = await mockAccountWithServersCallerCtx(server, source, permission);
            const message_router = messageRouter.createCaller(ctx);
            await expect(message_router.upsert(message)).rejects.toThrowError();
          },
          permissionsThatShouldWork: [],
          sourcesThatShouldWork: [],
        });
      });
      it("should fail trying all varaints of upsert updating a message that the author does own", async () => {
        await testAllVariants({
          async operation(source, permission) {
            const { ctx, account } = await mockAccountWithServersCallerCtx(
              server,
              source,
              permission
            );
            const message_router = messageRouter.createCaller(ctx);
            const msg = mockMessage(server, channel, account);
            await expect(message_router.upsert(msg)).rejects.toThrowError();
          },
          permissionsThatShouldWork: [],
          sourcesThatShouldWork: [],
        });
      });
    });
  });
  describe("Message Upsert Bulk", () => {
    describe("Message Upsert Bulk Create", () => {
      it("should upsert create a message as the ao bot", async () => {
        const result = await ao_bot_message_router.upsertBulk([message]);
        expect(result).toEqual([message]);
      });
      it("should only upsert messages of non ignored users", async () => {
        const ignored = mockAccount();
        await ao_bot_ignored_account_router.upsert(ignored.id);
        const msg = mockMessage(server, channel, ignored);
        const upserted = await ao_bot_message_router.upsertBulk([message, msg]);
        expect(upserted).toEqual([message]);
        await expect(ao_bot_message_router.byId(msg.id)).rejects.toThrowError();
      });
      it("should fail trying all varaints of upsert bulk creating a message that the author does not own", async () => {
        await testAllVariants({
          async operation(source, permission) {
            const { ctx } = await mockAccountWithServersCallerCtx(server, source, permission);
            const message_router = messageRouter.createCaller(ctx);
            await expect(message_router.upsertBulk([message])).rejects.toThrowError();
          },
        });
      });
      it("should fail try all varaints of upsert bulk creating a message that the author does own", async () => {
        await testAllVariants({
          async operation(source, permission) {
            const { ctx, account } = await mockAccountWithServersCallerCtx(
              server,
              source,
              permission
            );
            const message_router = messageRouter.createCaller(ctx);
            const msg = mockMessage(server, channel, account);
            await expect(message_router.upsertBulk([msg])).rejects.toThrowError();
          },
        });
      });
    });
    describe("Message Upsert Bulk Update", () => {
      beforeEach(async () => {
        await ao_bot_message_router.upsertBulk([message]);
      });
      it("should upsert update a message as the ao bot", async () => {
        const new_content = "new content";
        const result = await ao_bot_message_router.upsertBulk([
          {
            ...message,
            content: new_content,
          },
        ]);
        expect(result).toEqual([{ ...message, content: new_content }]);
      });
      it("should fail trying all varaints of upsert bulk updating a message that the author does not own", async () => {
        await testAllVariants({
          async operation(source, permission) {
            const { ctx } = await mockAccountWithServersCallerCtx(server, source, permission);
            const message_router = messageRouter.createCaller(ctx);
            await expect(message_router.upsertBulk([message])).rejects.toThrowError();
          },
          permissionsThatShouldWork: [],
          sourcesThatShouldWork: [],
        });
      });
      it("should fail trying all varaints of upsert bulk updating a message that the author does own", async () => {
        await testAllVariants({
          async operation(source, permission) {
            const { ctx, account } = await mockAccountWithServersCallerCtx(
              server,
              source,
              permission
            );
            const message_router = messageRouter.createCaller(ctx);
            const msg = mockMessage(server, channel, account);
            await expect(message_router.upsertBulk([msg])).rejects.toThrowError();
          },
          permissionsThatShouldWork: [],
          sourcesThatShouldWork: [],
        });
      });
    });
  });
  describe("Message Delete", () => {
    beforeEach(async () => {
      await ao_bot_message_router.upsert(message);
    });
    it("should delete a message as the ao bot", async () => {
      const result = await ao_bot_message_router.delete(message.id);
      expect(result).toBeTruthy();
    });
    it("should fail trying all varaints of delete a message that the author does not own", async () => {
      await testAllVariants({
        async operation(source, permission) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source, permission);
          const message_router = messageRouter.createCaller(ctx);
          await expect(message_router.delete(message.id)).rejects.toThrowError();
        },
      });
    });
    it("should fail trying all varaints of delete a message that the author does own", async () => {
      await testAllVariants({
        async operation(source, permission) {
          const { ctx, account } = await mockAccountWithServersCallerCtx(
            server,
            source,
            permission
          );
          const message_router = messageRouter.createCaller(ctx);
          const msg = mockMessage(server, channel, account);
          await expect(message_router.delete(msg.id)).rejects.toThrowError();
        },
      });
    });
  });
  describe("Message Delete Bulk", () => {
    beforeEach(async () => {
      await ao_bot_message_router.upsertBulk([message]);
      await ao_bot_message_router.upsertBulk([message2]);
    });
    it("should delete a message as the ao bot", async () => {
      const result = await ao_bot_message_router.deleteBulk([message.id, message2.id]);
      expect(result).toBeTruthy();
    });
    it("should fail trying all varaints of delete bulk a message that the author does not own", async () => {
      await testAllVariants({
        async operation(source, permission) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source, permission);
          const message_router = messageRouter.createCaller(ctx);
          await expect(message_router.deleteBulk([message.id])).rejects.toThrowError();
        },
      });
    });
    it("should fail trying all varaints of delete bulk a message that the author does own", async () => {
      await testAllVariants({
        async operation(source, permission) {
          const { ctx, account } = await mockAccountWithServersCallerCtx(
            server,
            source,
            permission
          );
          const message_router = messageRouter.createCaller(ctx);
          const msg = mockMessage(server, channel, account);
          await expect(message_router.deleteBulk([msg.id])).rejects.toThrowError();
        },
      });
    });
  });
});
