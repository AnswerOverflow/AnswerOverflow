import {
  Channel,
  ChannelWithFlags,
  createChannel,
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
  AUTO_THREAD_ALREADY_DISABLED_ERROR_MESSAGE,
  AUTO_THREAD_ALREADY_ENABLED_ERROR_MESSAGE,
  channelRouter,
  FORUM_GUIDELINES_CONSENT_ALREADY_DISABLED_ERROR_MESSAGE,
  FORUM_GUIDELINES_CONSENT_ALREADY_ENABLED_ERROR_MESSAGE,
  INDEXING_ALREADY_DISABLED_ERROR_MESSAGE,
  INDEXING_ALREADY_ENABLED_ERROR_MESSAGE,
  MARK_SOLUTION_ALREADY_DISABLED_ERROR_MESSAGE,
  MARK_SOLUTION_ALREADY_ENABLED_ERROR_MESSAGE,
  SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS_ALREADY_DISABLED_ERROR_MESSAGE,
  SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS_ALREADY_ENABLED_ERROR_MESSAGE,
  SOLVED_LABEL_ALREADY_SELECTED_ERROR_MESSAGE,
  SOLVED_LABEL_ALREADY_UNSELECTED_ERROR_MESSAGE,
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

async function validateChannelSettingsChange({
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
      await validateChannelSettingsChange({
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
      await validateChannelSettingsChange({
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
      await validateChannelSettingsChange({
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
      await validateChannelSettingsChange({
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
      await validateChannelSettingsChange({
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
      await validateChannelSettingsChange({
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
  describe("set send mark solution instructions in new threads", () => {
    it("should have all variants of setting send mark solution instructions in new threads enabled succeed", async () => {
      await validateChannelSettingsChange({
        act(channel, router) {
          return router.setSendMarkSolutionInstructionsInNewThreadsEnabled({
            channel,
            enabled: true,
          });
        },
        assert: (updated) =>
          expect(updated.flags.sendMarkSolutionInstructionsInNewThreads).toBeTruthy(),
      });
    });
    it("should have all variants of setting send mark solution instructions in new threads disabled succeed", async () => {
      await validateChannelSettingsChange({
        async setup({ server, channel }) {
          await createServer(server);
          await createChannel({
            ...channel,
            flags: {
              sendMarkSolutionInstructionsInNewThreads: true,
            },
          });
        },
        act(channel, router) {
          return router.setSendMarkSolutionInstructionsInNewThreadsEnabled({
            channel,
            enabled: false,
          });
        },
        assert: (updated) =>
          expect(updated.flags.sendMarkSolutionInstructionsInNewThreads).toBeFalsy(),
      });
    });
    it("should throw the correct error when setting send mark solution instructions in new threads enabled on a channel with send mark solution instructions in new threads already enabled", async () => {
      await createChannel({
        ...channel,
        flags: {
          sendMarkSolutionInstructionsInNewThreads: true,
        },
      });
      await expect(
        router.setSendMarkSolutionInstructionsInNewThreadsEnabled({
          channel: {
            server,
            ...channel,
          },
          enabled: true,
        })
      ).rejects.toThrowError(
        SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS_ALREADY_ENABLED_ERROR_MESSAGE
      );
    });
    it("should throw the correct error when setting send mark solution instructions in new threads disabled on a channel with send mark solution instructions in new threads already disabled", async () => {
      await createChannel({
        ...channel,
        flags: {
          sendMarkSolutionInstructionsInNewThreads: false,
        },
      });
      await expect(
        router.setSendMarkSolutionInstructionsInNewThreadsEnabled({
          channel: {
            server,
            ...channel,
          },
          enabled: false,
        })
      ).rejects.toThrowError(
        SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS_ALREADY_DISABLED_ERROR_MESSAGE
      );
    });
  });
  describe("set solution tag id", () => {
    it("should have all variants of setting solution tag id succeed", async () => {
      await validateChannelSettingsChange({
        act(channel, router) {
          return router.setSolutionTagId({
            channel,
            tagId: "tagId",
          });
        },
        assert: (updated) => expect(updated.solutionTagId).toBe("tagId"),
      });
    });
    it("should have all variants of clearing the solution tag id succeed", async () => {
      await validateChannelSettingsChange({
        async setup({ server, channel }) {
          await createServer(server);
          await createChannel({
            ...channel,
            solutionTagId: "tagId",
          });
        },
        act(channel, router) {
          return router.setSolutionTagId({
            channel,
            tagId: null,
          });
        },
        assert: (updated) => expect(updated.solutionTagId).toBeNull(),
      });
    });
    it("should throw the correct error when setting solution tag id on a channel with solution tag id already set", async () => {
      await createChannel({
        ...channel,
        solutionTagId: "tagId",
      });
      await expect(
        router.setSolutionTagId({
          channel: {
            server,
            ...channel,
          },
          tagId: "tagId",
        })
      ).rejects.toThrowError(SOLVED_LABEL_ALREADY_SELECTED_ERROR_MESSAGE);
    });
    it("should throw the correct error when clearing the solution tag id on a channel with no solution tag id set", async () => {
      await createChannel({
        ...channel,
        solutionTagId: null,
      });
      await expect(
        router.setSolutionTagId({
          channel: {
            server,
            ...channel,
          },
          tagId: null,
        })
      ).rejects.toThrowError(SOLVED_LABEL_ALREADY_UNSELECTED_ERROR_MESSAGE);
    });
  });
  describe("set auto thread enabled", () => {
    it("should have all variants of setting auto thread enabled succeed", async () => {
      await validateChannelSettingsChange({
        act(channel, router) {
          return router.setAutoThreadEnabled({
            channel,
            enabled: true,
          });
        },
        assert: (updated) => expect(updated.flags.autoThreadEnabled).toBeTruthy(),
      });
    });
    it("should have all variants of setting auto thread disabled succeed", async () => {
      await validateChannelSettingsChange({
        async setup({ server, channel }) {
          await createServer(server);
          await createChannel({
            ...channel,
            flags: {
              autoThreadEnabled: true,
            },
          });
        },
        act(channel, router) {
          return router.setAutoThreadEnabled({
            channel,
            enabled: false,
          });
        },
        assert: (updated) => expect(updated.flags.autoThreadEnabled).toBeFalsy(),
      });
    });
    it("should throw the correct error when setting auto thread enabled on a channel with auto thread already enabled", async () => {
      await createChannel({
        ...channel,
        flags: {
          autoThreadEnabled: true,
        },
      });
      await expect(
        router.setAutoThreadEnabled({
          channel: {
            server,
            ...channel,
          },
          enabled: true,
        })
      ).rejects.toThrowError(AUTO_THREAD_ALREADY_ENABLED_ERROR_MESSAGE);
    });
    it("should throw the correct error when setting auto thread disabled on a channel with auto thread already disabled", async () => {
      await createChannel({
        ...channel,
        flags: {
          autoThreadEnabled: false,
        },
      });
      await expect(
        router.setAutoThreadEnabled({
          channel: {
            server,
            ...channel,
          },
          enabled: false,
        })
      ).rejects.toThrowError(AUTO_THREAD_ALREADY_DISABLED_ERROR_MESSAGE);
    });
  });
});
