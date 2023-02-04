import { mockAccountWithServersCallerCtx, testAllVariantsThatThrowErrors } from "~api/test/utils";
import { createChannelSettings, prisma } from "@answeroverflow/db";
import { channelSettingsRouter } from "./channel-settings";
import { Server, Channel, createChannel, createServer } from "@answeroverflow/db";
import { MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE } from "~api/utils/permissions";
import { mockChannel, mockServer } from "@answeroverflow/db-mock";

let server: Server;
let channel: Channel;

beforeEach(async () => {
  server = mockServer();
  channel = mockChannel(server);

  await createServer(server, prisma);
  await createChannel(channel, prisma);
});

describe("Channel Settings Operations", () => {
  describe("Channel Settings Fetch", () => {
    beforeEach(async () => {
      await createChannelSettings(
        {
          channel_id: channel.id,
        },
        prisma
      );
    });
    it("should test fetching channel settings with all varaints", async () => {
      await testAllVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const caller = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = channelSettingsRouter.createCaller(caller.ctx);
          await router.byId(channel.id);
        },
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        sourcesThatShouldWork: ["discord-bot", "web-client"],
      });
    });
  });
  describe("Channel Settings By Invite Code", () => {
    let invite_code: string;
    beforeEach(async () => {
      // set to a random string to avoid collisions
      invite_code = Math.random().toString(36).substring(7);
      await createChannelSettings(
        {
          channel_id: channel.id,
          invite_code,
        },
        prisma
      );
    });
    it("should test fetching channel settings by invite code with all varaints", async () => {
      await testAllVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const caller = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = channelSettingsRouter.createCaller(caller.ctx);
          await router.byInviteCode(invite_code);
        },
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        sourcesThatShouldWork: ["discord-bot"],
      });
    });
  });
  describe("Channel Settings Create", () => {
    it("should test creating channel settings with all varaints", async () => {
      await testAllVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const caller = await mockAccountWithServersCallerCtx(server, source, permission);
          const chnl = mockChannel(server);
          await createChannel(chnl, prisma);
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
      await createChannelSettings(
        {
          channel_id: channel.id,
        },
        prisma
      );
    });
    it("should test updating channel settings with all varaints", async () => {
      await testAllVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const caller = await mockAccountWithServersCallerCtx(server, source, permission);
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
    it("should test creating channel settings with all varaints", async () => {
      await testAllVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const srv = mockServer();
          const caller = await mockAccountWithServersCallerCtx(srv, source, permission);
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
    describe("Channel Settings Upsert Create", () => {
      it("should test upsert creating channel settings with all varaints", async () => {
        await testAllVariantsThatThrowErrors({
          async operation({ source, permission }) {
            const caller = await mockAccountWithServersCallerCtx(server, source, permission);
            const chnl = mockChannel(server);
            await createChannel(chnl, prisma);
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
    describe("Channel Settings Upsert Update", () => {
      beforeEach(async () => {
        await createChannelSettings(
          {
            channel_id: channel.id,
          },
          prisma
        );
      });
      it("should test upsert updating channel settings with all varaints", async () => {
        await testAllVariantsThatThrowErrors({
          async operation({ source, permission }) {
            const caller = await mockAccountWithServersCallerCtx(server, source, permission);
            const router = channelSettingsRouter.createCaller(caller.ctx);
            await router.upsert({
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
  });
  describe("Channel Settings Upsert With Deps", () => {
    describe("Channel Settings Upsert With Deps Create", () => {
      it("should test upsert create channel settings with all varaints", async () => {
        await testAllVariantsThatThrowErrors({
          async operation({ source, permission }) {
            const srv = mockServer();
            const caller = await mockAccountWithServersCallerCtx(srv, source, permission);
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
    describe("Channel Settings Upsert With Deps Update", () => {
      beforeEach(async () => {
        await createChannelSettings(
          {
            channel_id: channel.id,
          },
          prisma
        );
      });
      it("should test upsert updating channel settings with all varaints", async () => {
        await testAllVariantsThatThrowErrors({
          async operation({ source, permission }) {
            const srv = mockServer();
            const caller = await mockAccountWithServersCallerCtx(srv, source, permission);
            const chnl = mockChannel(server);
            const router = channelSettingsRouter.createCaller(caller.ctx);
            await router.upsertWithDeps({
              channel: {
                ...chnl,
                server: srv,
              },
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
  });
});
