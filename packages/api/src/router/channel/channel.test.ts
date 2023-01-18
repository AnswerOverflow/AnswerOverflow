import { Channel, clearDatabase, Server } from "@answeroverflow/db";
import {
  mockServer,
  mockChannel,
  mockAccountWithCtx,
  createAnswerOverflowBotCtx,
  testAllVariants,
} from "~api/test/utils";
import { channelRouter, CHANNEL_NOT_FOUND_MESSAGES } from "./channel";
import { serverRouter } from "../server/server";
import { MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE } from "~api/utils/permissions";
import type { ChannelAll } from "./types";
import { pick } from "~api/utils/utils";

let ao_bot_server_router: ReturnType<(typeof serverRouter)["createCaller"]>;
let ao_bot_channel_router: ReturnType<(typeof channelRouter)["createCaller"]>;
let server: Server;
let channel: Channel;

beforeEach(async () => {
  await clearDatabase();
  server = mockServer();
  channel = mockChannel(server);
  const ao_bot = await createAnswerOverflowBotCtx();
  ao_bot_server_router = serverRouter.createCaller(ao_bot);
  ao_bot_channel_router = channelRouter.createCaller(ao_bot);
  await ao_bot_server_router.create(server);
});

export function pickPublicChannelData(channel: Channel) {
  return pick(channel, ["id", "name", "parent_id", "server_id", "type"]);
}

describe("Channel Operations", () => {
  describe("Channel Fetch", () => {
    beforeEach(async () => {
      await ao_bot_channel_router.create(channel);
    });
    it("should succeed fetching a channel as the answer overflow bot", async () => {
      const fetched = await ao_bot_channel_router.byId(channel.id);
      expect(fetched).toEqual(channel);
    });
    it("tests all variants for fetching a single channel", async () => {
      await testAllVariants({
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        async operation({ permission, source, should_permission_succeed, should_source_succeed }) {
          const account = await mockAccountWithCtx(server, source, permission);
          const router = channelRouter.createCaller(account.ctx);
          const fetched = await router.byId(channel.id);
          if (should_permission_succeed && should_source_succeed) {
            expect(fetched as ChannelAll).toEqual(channel);
          } else {
            expect(fetched).toStrictEqual(
              pick(fetched, ["id", "name", "parent_id", "server_id", "type"])
            );
          }
        },
      });
    });
  });

  describe("Channel Fetch Many", () => {
    let channel2: Channel;
    beforeEach(async () => {
      await ao_bot_channel_router.create(channel);
      channel2 = mockChannel(server);
      await ao_bot_channel_router.create(channel2);
    });
    it("should succeed fetching many channels as the answer overflow bot", async () => {
      const fetched = await ao_bot_channel_router.byIdMany([channel.id, channel2.id]);
      expect(fetched).toContainEqual(channel);
      expect(fetched).toContainEqual(channel2);
    });
    it("tests all variants for fetching many channels", async () => {
      await testAllVariants({
        sourcesThatShouldWork: ["discord-bot", "web-client"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        async operation({ permission, source, should_permission_succeed, should_source_succeed }) {
          const account = await mockAccountWithCtx(server, source, permission);
          const router = channelRouter.createCaller(account.ctx);
          const fetched = await router.byIdMany([channel.id, channel2.id]);
          if (should_permission_succeed && should_source_succeed) {
            expect(fetched).toContainEqual(channel);
            expect(fetched).toContainEqual(channel2);
          } else {
            expect(fetched).toContainEqual(pickPublicChannelData(channel));
            expect(fetched).toContainEqual(pickPublicChannelData(channel2));
          }
        },
      });
    });
  });

  describe("Channel Create", () => {
    it("tests all variants for creating a single channel", async () => {
      await testAllVariants({
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        async operation({ permission, source }) {
          const chnl = mockChannel(server);
          const account = await mockAccountWithCtx(server, source, permission);
          const router = channelRouter.createCaller(account.ctx);
          await router.create(chnl);
        },
      });
    });
    it("should succeed creating a channel as the answer overflow bot", async () => {
      const created = await ao_bot_channel_router.create(channel);
      expect(created).toEqual(channel);
    });
  });
  describe("Channel Create Many", () => {
    it("tests all variants for creating many channels", async () => {
      await testAllVariants({
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        async operation({ permission, source }) {
          const chnl = mockChannel(server);
          const chnl2 = mockChannel(server);
          const account = await mockAccountWithCtx(server, source, permission);
          const router = channelRouter.createCaller(account.ctx);
          const results = await router.createMany([chnl, chnl2]);
          expect(results).toContainEqual(chnl);
          expect(results).toContainEqual(chnl2);
        },
      });
    });
    it("should succeed creating many channels as the answer overflow bot", async () => {
      const channel2 = mockChannel(server);
      const created = await ao_bot_channel_router.createMany([channel, channel2]);
      expect(created).toContainEqual(channel);
      expect(created).toContainEqual(channel2);
    });
  });
  describe("Channel Update", () => {
    beforeEach(async () => {
      await ao_bot_channel_router.create(channel);
    });
    it("tests all varaints for updating a channel", async () => {
      await testAllVariants({
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        async operation({ permission, source }) {
          const account = await mockAccountWithCtx(server, source, permission);
          const router = channelRouter.createCaller(account.ctx);
          await router.update({
            id: channel.id,
            name: "new name",
          });
        },
      });
    });
    it("should succeed updating a channel as the answer overflow bot", async () => {
      const updated = await ao_bot_channel_router.update({
        id: channel.id,
        name: "new name",
      });
      expect(updated).toEqual({
        ...channel,
        name: "new name",
      });
    });
  });
  describe("Channel Update Many", () => {
    let channel2: Channel;
    beforeEach(async () => {
      channel2 = mockChannel(server);
      await ao_bot_channel_router.create(channel);
      await ao_bot_channel_router.create(channel2);
    });
    it("tests all variants for updating many channels", async () => {
      await testAllVariants({
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        async operation({ permission, source }) {
          const account = await mockAccountWithCtx(server, source, permission);
          const router = channelRouter.createCaller(account.ctx);
          await router.updateMany([
            {
              id: channel.id,
              name: "new name",
            },
            {
              id: channel2.id,
              name: "new name 2",
            },
          ]);
        },
      });
    });
    it("should succeed updating many channels as the answer overflow bot", async () => {
      const updated = await ao_bot_channel_router.updateMany([
        {
          id: channel.id,
          name: "new name",
        },
        {
          id: channel2.id,
          name: "new name 2",
        },
      ]);
      expect(updated).toContainEqual({
        ...channel,
        name: "new name",
      });
      expect(updated).toContainEqual({
        ...channel2,
        name: "new name 2",
      });
    });
  });
  describe("Channel Delete", () => {
    it("tests all varaints for deleting a channel", async () => {
      await testAllVariants({
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        async operation({ permission, source }) {
          const chnl = mockChannel(server);
          await ao_bot_channel_router.create(chnl);
          const account = await mockAccountWithCtx(server, source, permission);
          const router = channelRouter.createCaller(account.ctx);
          await router.delete(chnl.id);
        },
      });
    });
    it("should succeed deleting a channel as the answer overflow bot", async () => {
      const chnl = mockChannel(server);
      await ao_bot_channel_router.create(chnl);
      await ao_bot_channel_router.delete(chnl.id);
      await expect(ao_bot_channel_router.byId(chnl.id)).rejects.toThrow(CHANNEL_NOT_FOUND_MESSAGES);
    });
  });
  describe("Channel Upsert", () => {
    describe("Upsert Create", () => {
      it("tests all varaints for upsert creating a channel", async () => {
        await testAllVariants({
          sourcesThatShouldWork: ["discord-bot"],
          permissionsThatShouldWork: ["ManageGuild", "Administrator"],
          permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
          async operation({ permission, source }) {
            const chnl = mockChannel(server);
            const account = await mockAccountWithCtx(server, source, permission);
            const router = channelRouter.createCaller(account.ctx);
            await router.upsert(chnl);
          },
        });
      });
      it("should succeed upserting a channel as the answer overflow bot", async () => {
        const upserted = await ao_bot_channel_router.upsert(channel);
        expect(upserted).toEqual(channel);
      });
    });
    describe("Upsert Update", () => {
      beforeEach(async () => {
        await ao_bot_channel_router.create(channel);
      });
      it("tests all varaints for upsert updating a channel", async () => {
        await testAllVariants({
          sourcesThatShouldWork: ["discord-bot"],
          permissionsThatShouldWork: ["ManageGuild", "Administrator"],
          permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
          async operation({ permission, source }) {
            const account = await mockAccountWithCtx(server, source, permission);
            const router = channelRouter.createCaller(account.ctx);
            await router.upsert({
              ...channel,
              name: "new name",
            });
          },
        });
      });
      it("should succeed upserting a channel as the answer overflow bot", async () => {
        const upserted = await ao_bot_channel_router.upsert({
          ...channel,
          name: "new name",
        });
        expect(upserted).toEqual({
          ...channel,
          name: "new name",
        });
      });
    });
  });
});
