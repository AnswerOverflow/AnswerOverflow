import { mockAccountWithServersCallerCtx, testAllSources } from "~api/test/utils";
import {
  Server,
  DiscordAccount,
  createServer,
  createDiscordAccount,
  createUserServerSettings,
} from "@answeroverflow/db";
import { userServerSettingsRouter } from "./user-server-settings";
import { mockDiscordAccount, mockServer } from "@answeroverflow/db-mock";
import { NOT_AUTHORIZED_MESSAGE } from "~api/utils/permissions";
import { ManageAccountSource, MESSAGE_INDEXING_ALREADY_DISABLED_MESSAGE, MESSAGE_INDEXING_ALREADY_ENABLED_MESSAGE } from "./types";

let server: Server;
let discordAccount: DiscordAccount;
let discordAccount2: DiscordAccount;
beforeEach(async () => {
  server = mockServer();
  discordAccount = mockDiscordAccount();
  discordAccount2 = mockDiscordAccount();

  await createServer(server);
  await createDiscordAccount(discordAccount);
  await createDiscordAccount(discordAccount2);
});

export async function testAllToggleIndexingScenarios(
  operation: ({
    manageAccountSource,
    router,
    account,
  }: {
    manageAccountSource: ManageAccountSource;
    account: DiscordAccount;
    router: ReturnType<typeof userServerSettingsRouter.createCaller>;
  }) => Promise<void>
) {
  const { ctx, account } = await mockAccountWithServersCallerCtx(server, "discord-bot", undefined);
  const router = userServerSettingsRouter.createCaller(ctx);
  await operation({
    manageAccountSource: "manage-account-menu",
    account,
    router,
  });
}

describe("User Server Settings Operations", () => {
  describe("User Server Settings By Id", () => {
    beforeEach(async () => {
      await createUserServerSettings({
        serverId: server.id,
        userId: discordAccount.id,
      });
    });
    it("should fail all varaints getting user server settings by id as a different user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source);
          const router = userServerSettingsRouter.createCaller(ctx);
          await expect(
            router.byId({
              serverId: server.id,
              userId: discordAccount.id,
            })
          ).rejects.toThrowError();
        },
      });
    });
    it("should succeed all variants getting user server settings by id as that user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountWithServersCallerCtx(
            server,
            source,
            undefined,
            discordAccount
          );
          const router = userServerSettingsRouter.createCaller(ctx);
          const userServerSettings = await router.byId({
            serverId: server.id,
            userId: discordAccount.id,
          });
          expect(userServerSettings).toBeDefined();
          expect(userServerSettings?.serverId).toEqual(server.id);
          expect(userServerSettings?.userId).toEqual(discordAccount.id);
        },
      });
    });
  });
  describe("Set Indexing Disabled", () => {
    describe("Failures", () => {
      it("should fail all variants setting indexing disabled as a different user", async () => {
        await testAllToggleIndexingScenarios(async ({ router }) => {
          await expect(
            router.setIndexingDisabled({
              data: {
                serverId: server.id,
                user: mockDiscordAccount(), // use a different user than the caller
                flags: {
                  messageIndexingDisabled: true,
                },
              },
              source: "manage-account-menu",
            })
          ).rejects.toThrowError(NOT_AUTHORIZED_MESSAGE);
        });
      });
      it("should fail all variants of setting indexing enabled when it is already enabled", async () => {
        await testAllToggleIndexingScenarios(async ({ router, account }) => {
          await createDiscordAccount(account);
          await createUserServerSettings({
            serverId: server.id,
            userId: account.id,
            flags: {
              messageIndexingDisabled: false,
            },
          });
          await expect(
            router.setIndexingDisabled({
              data: {
                serverId: server.id,
                user: account,
                flags: {
                  messageIndexingDisabled: false,
                },
              },
              source: "manage-account-menu",
            })
          ).rejects.toThrowError(MESSAGE_INDEXING_ALREADY_ENABLED_MESSAGE);
        });
      });
      it("should fail all variants of setting indexing disabled when it is already disabled", async () => {
        await testAllToggleIndexingScenarios(async ({ router, account }) => {
          await createDiscordAccount(account);
          await createUserServerSettings({
            serverId: server.id,
            userId: account.id,
            flags: {
              messageIndexingDisabled: true,
            },
          });
          await expect(
            router.setIndexingDisabled({
              data: {
                serverId: server.id,
                user: account,
                flags: {
                  messageIndexingDisabled: true,
                },
              },
              source: "manage-account-menu",
            })
          ).rejects.toThrowError(MESSAGE_INDEXING_ALREADY_DISABLED_MESSAGE);
        });
      });
    });
    describe("Successes", () => {
      it("should succeed all variants setting indexing disabled as that user", async () => {
        await testAllToggleIndexingScenarios(async ({ router, account }) => {
          const userServerSettings = await router.setIndexingDisabled({
            data: {
              serverId: server.id,
              user: account,
              flags: {
                messageIndexingDisabled: true,
              },
            },
            source: "manage-account-menu",
          });
          expect(userServerSettings).toBeDefined();
          expect(userServerSettings?.serverId).toEqual(server.id);
          expect(userServerSettings?.userId).toEqual(account.id);
          expect(userServerSettings?.flags.messageIndexingDisabled).toEqual(true);
        });
      });
      it("should succeed all variants of setting indexing disabled on a user that has consented to publicly display their messages", async () => {
        await testAllToggleIndexingScenarios(async ({ router, account }) => {
          await createDiscordAccount(account);
          await createUserServerSettings({
            serverId: server.id,
            userId: account.id,
            flags: {
              canPubliclyDisplayMessages: true,
            },
          });
          const userServerSettings = await router.setIndexingDisabled({
            data: {
              serverId: server.id,
              user: account,
              flags: {
                messageIndexingDisabled: true,
              },
            },
            source: "manage-account-menu",
          });
          expect(userServerSettings).toBeDefined();
          expect(userServerSettings?.serverId).toEqual(server.id);
          expect(userServerSettings?.userId).toEqual(account.id);
          expect(userServerSettings?.flags.messageIndexingDisabled).toEqual(true);
          expect(userServerSettings?.flags.canPubliclyDisplayMessages).toEqual(false);
        });
      });
    });
  });
});
