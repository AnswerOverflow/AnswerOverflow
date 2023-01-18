import {
  createAnswerOverflowBotCtx,
  mockAccountWithCtx,
  mockChannel,
  mockServer,
  testAllVariants,
} from "~api/test/utils";
import { serverRouter } from "../server/server";
import { channelRouter } from "./channel";
import { channelSettingsRouter } from "./channel_settings";
import { Server, Channel, clearDatabase } from "@answeroverflow/db";
import { MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE } from "~api/utils/permissions";

let ao_bot_server_router: ReturnType<(typeof serverRouter)["createCaller"]>;
let ao_bot_channel_router: ReturnType<(typeof channelRouter)["createCaller"]>;
let ao_bot_channel_settings_router: ReturnType<(typeof channelSettingsRouter)["createCaller"]>;
let server: Server;
let channel: Channel;

beforeEach(async () => {
  await clearDatabase();
  server = mockServer();
  channel = mockChannel(server);
  const ao_bot = await createAnswerOverflowBotCtx();
  ao_bot_server_router = serverRouter.createCaller(ao_bot);
  ao_bot_channel_router = channelRouter.createCaller(ao_bot);
  ao_bot_channel_settings_router = channelSettingsRouter.createCaller(ao_bot);
  await ao_bot_server_router.create(server);
  await ao_bot_channel_router.create(channel);
});

describe("Channel Settings Operations", () => {
  describe("Channel Settings Fetch", () => {
    beforeEach(async () => {
      await ao_bot_channel_settings_router.create({
        channel_id: channel.id,
      });
    });
    it("should fetch channel settings as the Answer Overflow Bot", async () => {
      const channel_settings = await ao_bot_channel_settings_router.byId(channel.id);
      expect(channel_settings.channel_id).toBe(channel.id);
    });
    it("should test fetching channel settings with all varaints", async () => {
      await testAllVariants({
        async operation({ source, permission }) {
          const caller = await mockAccountWithCtx(server, source, permission);
          const router = channelSettingsRouter.createCaller(caller.ctx);
          await router.byId(channel.id);
        },
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        sourcesThatShouldWork: ["discord-bot"],
      });
    });
  });
  describe("Channel Settings By Invite Code", () => {
    beforeEach(async () => {
      await ao_bot_channel_settings_router.create({
        channel_id: channel.id,
        invite_code: "potato",
      });
    });
    it("should fetch channel settings by id as the Answer Overflow Bot", async () => {
      const channel_settings = await ao_bot_channel_settings_router.byInviteCode("potato");
      expect(channel_settings.channel_id).toBe(channel.id);
      expect(channel_settings.invite_code).toBe("potato");
    });
    it("should test fetching channel settings by id with all varaints", async () => {
      await testAllVariants({
        async operation({ source, permission }) {
          const caller = await mockAccountWithCtx(server, source, permission);
          const router = channelSettingsRouter.createCaller(caller.ctx);
          await router.byInviteCode("potato");
        },
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        sourcesThatShouldWork: ["discord-bot"],
      });
    });
  });
  describe("Channel Settings Create", () => {
    it("should create channel settings as the Answer Overflow Bot", async () => {
      const channel_settings = await ao_bot_channel_settings_router.create({
        channel_id: channel.id,
      });
      expect(channel_settings.channel_id).toBe(channel.id);
    });
    it("should test creating channel settings with all varaints", async () => {
      await testAllVariants({
        async operation({ source, permission }) {
          const caller = await mockAccountWithCtx(server, source, permission);
          const chnl = mockChannel(server);
          await ao_bot_channel_router.create(chnl);
          const router = channelSettingsRouter.createCaller(caller.ctx);
          await router.create({
            channel_id: chnl.id,
          });
        },
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        sourcesThatShouldWork: ["discord-bot"],
      });
    });
  });
  describe("Channel Settings Update", () => {
    beforeEach(async () => {
      await ao_bot_channel_settings_router.create({
        channel_id: channel.id,
        flags: {
          indexing_enabled: false,
        },
      });
    });

    it("should update channel settings as the Answer Overflow Bot", async () => {
      const channel_settings = await ao_bot_channel_settings_router.update({
        channel_id: channel.id,
        flags: {
          indexing_enabled: true,
        },
      });
      expect(channel_settings.channel_id).toBe(channel.id);
      expect(channel_settings.flags.indexing_enabled).toBe(true);
    });
    it("should test updating channel settings with all varaints", async () => {
      await testAllVariants({
        async operation({ source, permission }) {
          const caller = await mockAccountWithCtx(server, source, permission);
          const router = channelSettingsRouter.createCaller(caller.ctx);
          await router.update({
            channel_id: channel.id,
            flags: {
              indexing_enabled: true,
            },
          });
        },
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        sourcesThatShouldWork: ["discord-bot"],
      });
    });
  });
  describe("Channel Settings Create With Deps", () => {
    it("should create channel settings as the Answer Overflow Bot", async () => {
      const channel_settings = await ao_bot_channel_settings_router.createWithDeps({
        channel: {
          ...channel,
          server: server,
        },
      });
      expect(channel_settings.channel_id).toBe(channel.id);
    });
    it("should test creating channel settings with all varaints", async () => {
      await testAllVariants({
        async operation({ source, permission }) {
          const srv = mockServer();
          const caller = await mockAccountWithCtx(srv, source, permission);
          const chnl = mockChannel(server);
          const router = channelSettingsRouter.createCaller(caller.ctx);
          await router.createWithDeps({
            channel: {
              ...chnl,
              server: srv,
            },
          });
        },
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        sourcesThatShouldWork: ["discord-bot"],
      });
    });
  });
  describe("Channel Settings Upsert", () => {
    it("should upsert channel settings as the Answer Overflow Bot", async () => {
      const channel_settings = await ao_bot_channel_settings_router.upsert({
        channel_id: channel.id,
      });
      expect(channel_settings.channel_id).toBe(channel.id);
    });
    it("should test upserting channel settings with all varaints", async () => {
      await testAllVariants({
        async operation({ source, permission }) {
          const caller = await mockAccountWithCtx(server, source, permission);
          const chnl = mockChannel(server);
          await ao_bot_channel_router.create(chnl);
          const router = channelSettingsRouter.createCaller(caller.ctx);
          await router.upsert({
            channel_id: chnl.id,
          });
        },
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        sourcesThatShouldWork: ["discord-bot"],
      });
    });
  });
  describe("Channel Settings Upsert With Deps", () => {
    it("should upsert channel settings as the Answer Overflow Bot", async () => {
      const channel_settings = await ao_bot_channel_settings_router.upsertWithDeps({
        channel: {
          ...channel,
          server: server,
        },
      });
      expect(channel_settings.channel_id).toBe(channel.id);
    });
    it("should test upserting channel settings with all varaints", async () => {
      await testAllVariants({
        async operation({ source, permission }) {
          const srv = mockServer();
          const caller = await mockAccountWithCtx(srv, source, permission);
          const chnl = mockChannel(server);
          const router = channelSettingsRouter.createCaller(caller.ctx);
          await router.upsertWithDeps({
            channel: {
              ...chnl,
              server: srv,
            },
          });
        },
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        sourcesThatShouldWork: ["discord-bot"],
      });
    });
  });
});
