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
    it("should fail all variants setting indexing disabled as a different user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source);
          const router = userServerSettingsRouter.createCaller(ctx);
          await expect(
            router.setIndexingDisabled({
              data: {
                serverId: server.id,
                user: discordAccount,
                flags: {
                  messageIndexingDisabled: true,
                },
              },
              source: "manage-account-menu",
            })
          ).rejects.toThrowError(NOT_AUTHORIZED_MESSAGE);
        },
      });
    });
    it("should succeed all variants setting indexing disabled as that user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountWithServersCallerCtx(server, source, undefined);
          const router = userServerSettingsRouter.createCaller(ctx);
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
        },
      });
    });
    it("should succeed all variants of setting indexing disabled on a user that has consented to publicly display their messages", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountWithServersCallerCtx(server, source, undefined);
          const router = userServerSettingsRouter.createCaller(ctx);
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
          expect(userServerSettings?.flags.canPubliclyDisplayMessages).toEqual(true);
        },
      });
    });
  });
});
