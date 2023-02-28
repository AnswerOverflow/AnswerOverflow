import {
  Channel,
  ChannelWithFlags,
  createChannel,
  createServer,
  DiscordAccount,
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
  MARK_SOLUTION_ALREADY_DISABLED_ERROR_MESSAGE,
  MARK_SOLUTION_ALREADY_ENABLED_ERROR_MESSAGE,
  zChannelWithServerCreate,
} from "./channel";
import { mockChannel, mockServer } from "@answeroverflow/db-mock";
import { pickPublicChannelData } from "~api/test/public-data";
import type { z } from "zod";

let server: Server;
let channel: Channel;
let router: ReturnType<typeof channelRouter.createCaller>;
beforeEach(async () => {
  server = mockServer();
  channel = mockChannel(server);
  await createServer(server);
  const account = await mockAccountWithServersCallerCtx(server, "discord-bot", "ManageGuild");
  router = channelRouter.createCaller(account.ctx);
});

async function validateFlagChange({
  assert,
  act,
  setup = () => {},
}: {
  setup?: ({
    server,
    channel,
    account,
    router,
  }: {
    server: Server;
    channel: Channel;
    account: Awaited<ReturnType<typeof mockAccountWithServersCallerCtx>>;
    router: ReturnType<typeof channelRouter.createCaller>;
  }) => Promise<unknown> | unknown;
  assert: (channel: ChannelWithFlags) => void;
  act: (
    channel: z.infer<typeof zChannelWithServerCreate>,
    router: ReturnType<typeof channelRouter.createCaller>
  ) => Promise<unknown>;
}) {
  await testAllSourceAndPermissionVariantsThatThrowErrors({
    async operation({ source, permission }) {
      const server = mockServer();
      const chnl = mockChannel(server);
      const account = await mockAccountWithServersCallerCtx(server, source, permission);
      const router = channelRouter.createCaller(account.ctx);
      await setup({
        server,
        channel: chnl,
        account,
        router,
      });
      await act(
        {
          server,
          ...chnl,
        },
        router
      );
      const updated = await findChannelById(chnl.id);
      assert(updated!);
    },
    sourcesThatShouldWork: ["discord-bot"],
    permissionsThatShouldWork: ["ManageGuild", "Administrator"],
  });
}

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
      await validateFlagChange({
        act(channel, router) {
          return router.setIndexingEnabled({
            channel,
            enabled: true,
          });
        },
        assert: (updated) => expect(updated.flags.indexingEnabled).toBeTruthy(),
      });
    });
    it("should have all variants of setting indexing disabled succeed", async () => {
      await validateFlagChange({
        async setup({ server, channel }) {
          await createServer(server);
          await createChannel({
            ...channel,
            flags: {
              indexingEnabled: true,
            },
          });
        },
        act(channel, router) {
          return router.setIndexingEnabled({
            channel,
            enabled: false,
          });
        },
        assert: (updated) => expect(updated.flags.indexingEnabled).toBeFalsy(),
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
      await validateFlagChange({
        act(channel, router) {
          return router.setForumGuidelinesConsentEnabled({
            channel,
            enabled: true,
          });
        },
        assert: (updated) => expect(updated.flags.forumGuidelinesConsentEnabled).toBeTruthy(),
      });
    });
    it("should have all variants of setting forum post guidelines disabled succeed", async () => {
      await validateFlagChange({
        async setup({ server, channel }) {
          await createServer(server);
          await createChannel({
            ...channel,
            flags: {
              forumGuidelinesConsentEnabled: true,
            },
          });
        },
        act(channel, router) {
          return router.setForumGuidelinesConsentEnabled({
            channel,
            enabled: false,
          });
        },
        assert: (updated) => expect(updated.flags.forumGuidelinesConsentEnabled).toBeFalsy(),
      });
      it("should throw the correct error when setting forum post guidelines enabled on a channel with forum post guidelines already enabled", async () => {
        await createChannel({
          ...channel,
          flags: {
            forumGuidelinesConsentEnabled: true,
          },
        });
        await expect(
          router.setForumGuidelinesConsentEnabled({
            channel: {
              server,
              ...channel,
            },
            enabled: true,
          })
        ).rejects.toThrowError(FORUM_GUIDELINES_CONSENT_ALREADY_ENABLED_ERROR_MESSAGE);
      });
      it("should throw the correct error when setting forum post guidelines disabled on a channel with forum post guidelines already disabled", async () => {
        await createChannel({
          ...channel,
          flags: {
            forumGuidelinesConsentEnabled: false,
          },
        });
        await expect(
          router.setForumGuidelinesConsentEnabled({
            channel: {
              server,
              ...channel,
            },
            enabled: false,
          })
        ).rejects.toThrowError(FORUM_GUIDELINES_CONSENT_ALREADY_DISABLED_ERROR_MESSAGE);
      });
    });
  });
  describe("set mark solution enabled", () => {
    it("should have all variants of setting mark solution enabled succeed", async () => {
      await validateFlagChange({
        act(channel, router) {
          return router.setMarkSolutionEnabled({
            channel,
            enabled: true,
          });
        },
        assert: (updated) => expect(updated.flags.markSolutionEnabled).toBeTruthy(),
      });
    });
    it("should have all variants of setting mark solution disabled succeed", async () => {
      await validateFlagChange({
        async setup({ server, channel }) {
          await createServer(server);
          await createChannel({
            ...channel,
            flags: {
              markSolutionEnabled: true,
            },
          });
        },
        act(channel, router) {
          return router.setMarkSolutionEnabled({
            channel,
            enabled: false,
          });
        },
        assert: (updated) => expect(updated.flags.markSolutionEnabled).toBeFalsy(),
      });
    });
    it("should throw the correct error when setting mark solution enabled on a channel with mark solution already enabled", async () => {
      await createChannel({
        ...channel,
        flags: {
          markSolutionEnabled: true,
        },
      });
      await expect(
        router.setMarkSolutionEnabled({
          channel: {
            server,
            ...channel,
          },
          enabled: true,
        })
      ).rejects.toThrowError(MARK_SOLUTION_ALREADY_ENABLED_ERROR_MESSAGE);
    });
    it("should throw the correct error when setting mark solution disabled on a channel with mark solution already disabled", async () => {
      await createChannel({
        ...channel,
        flags: {
          markSolutionEnabled: false,
        },
      });
      await expect(
        router.setMarkSolutionEnabled({
          channel: {
            server,
            ...channel,
          },
          enabled: false,
        })
      ).rejects.toThrowError(MARK_SOLUTION_ALREADY_DISABLED_ERROR_MESSAGE);
    });
  });
});
