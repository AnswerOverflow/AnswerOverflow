import {
  Channel,
  createChannel,
  createChannelWithDeps,
  createServer,
  findChannelById,
  Server,
} from "@answeroverflow/db";
import {
  mockAccountWithServersCallerCtx,
  testAllPublicAndPrivateDataVariants,
  testAllSourceAndPermissionVariantsThatThrowErrors,
} from "~api/test/utils";
import {
  channelRouter,
  FORUM_GUIDELINES_CONSENT_ALREADY_DISABLED_ERROR_MESSAGE,
  FORUM_GUIDELINES_CONSENT_ALREADY_ENABLED_ERROR_MESSAGE,
  INDEXING_ALREADY_DISABLED_ERROR_MESSAGE,
  INDEXING_ALREADY_ENABLED_ERROR_MESSAGE,
} from "./channel";
import { mockChannel, mockServer } from "@answeroverflow/db-mock";
import { pickPublicChannelData } from "~api/test/public-data";

let server: Server;
let channel: Channel;

beforeEach(async () => {
  server = mockServer();
  channel = mockChannel(server);
  await createServer(server);
});

describe("Channel Operations", () => {
  describe("Channel Fetch", () => {
    beforeEach(async () => {
      await createChannel(channel);
    });
    it("tests all variants for fetching a single channel", async () => {
      await testAllPublicAndPrivateDataVariants({
        sourcesThatShouldWork: ["discord-bot", "web-client"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        async fetch({ permission, source }) {
          const account = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = channelRouter.createCaller(account.ctx);
          const data = await router.byId(channel.id);
          return {
            data,
            privateDataFormat: data,
            publicDataFormat: pickPublicChannelData(data),
          };
        },
      });
    });
  });
  describe("Set Indexing Enabled", () => {
    it("should have all variants of setting indexing enabled succeed", async () => {
      await testAllSourceAndPermissionVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const server = mockServer();
          const chnl = mockChannel(server);
          const account = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = channelRouter.createCaller(account.ctx);
          await router.setIndexingEnabled({
            channel: {
              server,
              ...chnl,
            },
            enabled: true,
          });
          const updated = await findChannelById(chnl.id);
          expect(updated!.flags.indexingEnabled).toBeTruthy();
        },
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
      });
    });
    it("should have all variants of setting indexing disabled succeed", async () => {
      await testAllSourceAndPermissionVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const server = mockServer();
          const chnl = mockChannel(server);
          const account = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = channelRouter.createCaller(account.ctx);
          await createServer(server);
          await createChannel({
            ...chnl,
            flags: {
              indexingEnabled: true,
            },
          });
          await router.setIndexingEnabled({
            channel: {
              server,
              ...chnl,
            },
            enabled: false,
          });
          const updated = await findChannelById(chnl.id);
          expect(updated!.flags.indexingEnabled).toBeFalsy();
        },
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
      });
    });
    it("should throw the correct error when setting indexing enabled on a channel with indexing already enabled", async () => {
      const server = mockServer();
      const chnl = mockChannel(server);
      const account = await mockAccountWithServersCallerCtx(server, "discord-bot", "ManageGuild");
      const router = channelRouter.createCaller(account.ctx);
      await createServer(server);
      await createChannel({
        ...chnl,
        flags: {
          indexingEnabled: true,
        },
      });
      await expect(
        router.setIndexingEnabled({
          channel: {
            server,
            ...chnl,
          },
          enabled: true,
        })
      ).rejects.toThrowError(INDEXING_ALREADY_ENABLED_ERROR_MESSAGE);
    });
    it("should throw the correct error when setting indexing disabled on a channel with indexing already disabled", async () => {
      const server = mockServer();
      const chnl = mockChannel(server);
      const account = await mockAccountWithServersCallerCtx(server, "discord-bot", "ManageGuild");
      const router = channelRouter.createCaller(account.ctx);
      await createServer(server);
      await createChannel({
        ...chnl,
        flags: {
          indexingEnabled: false,
        },
      });
      await expect(
        router.setIndexingEnabled({
          channel: {
            server,
            ...chnl,
          },
          enabled: false,
        })
      ).rejects.toThrowError(INDEXING_ALREADY_DISABLED_ERROR_MESSAGE);
    });
  });
  describe("set forum post guidelines enabled", () => {
    it("should have all variants of setting forum post guidelines enabled succeed", async () => {
      await testAllSourceAndPermissionVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const server = mockServer();
          const chnl = mockChannel(server);
          const account = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = channelRouter.createCaller(account.ctx);
          await router.setForumGuidelinesConsentEnabled({
            channel: {
              server,
              ...chnl,
            },
            enabled: true,
          });
          const updated = await findChannelById(chnl.id);
          expect(updated!.flags.forumGuidelinesConsentEnabled).toBeTruthy();
        },
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
      });
    });
    it("should have all variants of setting forum post guidelines disabled succeed", async () => {
      await testAllSourceAndPermissionVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const server = mockServer();
          const chnl = mockChannel(server);
          const account = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = channelRouter.createCaller(account.ctx);
          await createServer(server);
          await createChannel({
            ...chnl,
            flags: {
              forumGuidelinesConsentEnabled: true,
            },
          });
          await router.setForumGuidelinesConsentEnabled({
            channel: {
              server,
              ...chnl,
            },
            enabled: false,
          });
          const updated = await findChannelById(chnl.id);
          expect(updated!.flags.forumGuidelinesConsentEnabled).toBeFalsy();
        },
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
      });
      it("should throw the correct error when setting forum post guidelines enabled on a channel with forum post guidelines already enabled", async () => {
        const server = mockServer();
        const chnl = mockChannel(server);
        const account = await mockAccountWithServersCallerCtx(server, "discord-bot", "ManageGuild");
        const router = channelRouter.createCaller(account.ctx);
        await createServer(server);
        await createChannel({
          ...chnl,
          flags: {
            forumGuidelinesConsentEnabled: true,
          },
        });
        await expect(
          router.setForumGuidelinesConsentEnabled({
            channel: {
              server,
              ...chnl,
            },
            enabled: true,
          })
        ).rejects.toThrowError(FORUM_GUIDELINES_CONSENT_ALREADY_ENABLED_ERROR_MESSAGE);
      });
      it("should throw the correct error when setting forum post guidelines disabled on a channel with forum post guidelines already disabled", async () => {
        const server = mockServer();
        const chnl = mockChannel(server);
        const account = await mockAccountWithServersCallerCtx(server, "discord-bot", "ManageGuild");
        const router = channelRouter.createCaller(account.ctx);
        await createServer(server);
        await createChannel({
          ...chnl,
          flags: {
            forumGuidelinesConsentEnabled: false,
          },
        });
        await expect(
          router.setForumGuidelinesConsentEnabled({
            channel: {
              server,
              ...chnl,
            },
            enabled: false,
          })
        ).rejects.toThrowError(FORUM_GUIDELINES_CONSENT_ALREADY_DISABLED_ERROR_MESSAGE);
      });
    });
  });
});
