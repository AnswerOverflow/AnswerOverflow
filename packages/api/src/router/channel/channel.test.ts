import { Channel, clearDatabase, Server, Thread } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";
import {
  mockServer,
  mockChannel,
  mockThread,
  mockAccount,
  createAnswerOverflowBotCtx,
  testAllVariants,
} from "~api/test/utils";
import { channelRouter } from "./channel";
import { serverRouter } from "../server/server";
import { MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE } from "~api/utils/permissions";

let manage_guild_router: ReturnType<(typeof serverRouter)["createCaller"]>;
let manage_channel_router: ReturnType<(typeof channelRouter)["createCaller"]>;
let ao_bot_server_router: ReturnType<(typeof serverRouter)["createCaller"]>;
let ao_bot_channel_router: ReturnType<(typeof channelRouter)["createCaller"]>;
let server: Server;
let channel_1: Channel;
let thread_1: Thread;
beforeEach(async () => {
  await clearDatabase();
  server = mockServer();
  channel_1 = mockChannel(server);
  thread_1 = mockThread(channel_1);
  const guild_manager = await mockAccount(server, "discord-bot", "ManageGuild");
  manage_guild_router = serverRouter.createCaller(guild_manager.ctx);
  manage_channel_router = channelRouter.createCaller(guild_manager.ctx);

  const ao_bot = await createAnswerOverflowBotCtx();
  ao_bot_server_router = serverRouter.createCaller(ao_bot);
  ao_bot_channel_router = channelRouter.createCaller(ao_bot);
});

describe("Channel Operations", () => {
  describe("Channel Create", () => {
    it("should succeed creating a channel with manage guild", async () => {
      await manage_guild_router.create(server);
      const channel = await manage_channel_router.create(channel_1);
      expect(channel).toEqual(channel_1);
    });
    it("should succeed creating a channel as answer overflow bot", async () => {
      await ao_bot_server_router.create(server);
      const channel = await ao_bot_channel_router.create(channel_1);
      expect(channel).toEqual(channel_1);
    });
    it("should test creating a channel with all permission and caller varaints", async () => {
      const serv = mockServer();
      await ao_bot_server_router.create(serv);
      await testAllVariants({
        async operation({ source, permission }) {
          const chan = mockChannel(serv);
          const caller = await mockAccount(serv, source, permission);
          const router = channelRouter.createCaller(caller.ctx);
          await router.create(chan);
        },
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        sourcesThatShouldWork: ["discord-bot"],
      });
    });
  });
  describe("Channel Update", () => {
    it("should succeed updating a channel with manage guild", async () => {
      await manage_guild_router.create(server);
      await manage_channel_router.create(channel_1);
      const channel = await manage_channel_router.update({
        id: channel_1.id,
        name: "new name",
      });
      expect(channel).toEqual({ ...channel_1, name: "new name" });
    });
    it.only("should test updating a channel permission and caller varaints", async () => {
      const serv = mockServer();
      await ao_bot_server_router.create(serv);
      const chan = mockChannel(serv);
      await ao_bot_channel_router.create(chan);
      await testAllVariants({
        async operation({ source, permission }) {
          const caller = await mockAccount(serv, source, permission);
          const router = channelRouter.createCaller(caller.ctx);
          await router.update({
            id: chan.id,
            name: "new name",
          });
        },
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        sourcesThatShouldWork: ["discord-bot"],
      });
    });
  });

  describe("Channel Upsert", () => {
    it("should succeed upserting a new channel with manage guild", async () => {
      await manage_guild_router.create(server);
      const channel = await manage_channel_router.upsert(channel_1);
      expect(channel).toEqual(channel_1);
    });
    it("should fail upserting a new channel with default permissions", async () => {
      await manage_guild_router.create(server);
      await expect(default_channel_router.upsert(channel_1)).rejects.toThrow(TRPCError);
    });
    it("should upsert a channel with dependencies", async () => {
      const channel = await manage_channel_router.upsertWithDeps({
        ...channel_1,
        server: server,
      });
      expect(channel).toEqual(channel_1);
    });
    it("should succeed upserting many channels", async () => {
      await manage_guild_router.create(server);
      const channels = await manage_channel_router.upsertMany(
        test_data_1.text_channels.map((channel) => channel.channel)
      );
      expect(channels).toEqual(test_data_1.text_channels.map((channel) => channel.channel));
    });
  });

  describe("Thread Upsert", () => {
    it("should succeed upserting a new thread with manage guild", async () => {
      await manage_guild_router.create(server);
      const thread = await manage_channel_router.upsertThreadWithDeps({
        ...thread_1,
        parent: {
          ...channel_1,
          server: server,
        },
      });
      expect(thread).toEqual(test_data_1.text_channels[0]!.threads[0]!.thread);
    });
  });
});
