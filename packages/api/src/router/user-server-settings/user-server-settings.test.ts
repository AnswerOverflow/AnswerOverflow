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
  describe("User Server Settings Create", () => {
    it("should fail all variants creating user server settings as a different user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source);
          const router = userServerSettingsRouter.createCaller(ctx);
          await expect(
            router.create({
              serverId: server.id,
              userId: discordAccount.id,
            })
          ).rejects.toThrowError();
        },
      });
    });
    it("should succeed all variants creating user server settings as that user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountWithServersCallerCtx(server, source);
          await createDiscordAccount(account);
          const router = userServerSettingsRouter.createCaller(ctx);
          const userServerSettings = await router.create({
            serverId: server.id,
            userId: account.id,
          });
          expect(userServerSettings).toBeDefined();
          expect(userServerSettings.serverId).toEqual(server.id);
          expect(userServerSettings.userId).toEqual(account.id);
        },
      });
    });
  });
  describe("User Server Settings Update", () => {
    beforeEach(async () => {
      await createUserServerSettings({
        serverId: server.id,
        userId: discordAccount.id,
      });
    });
    it("should fail all variants updating user server settings as a different user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source);
          const router = userServerSettingsRouter.createCaller(ctx);
          await expect(
            router.update({
              serverId: server.id,
              userId: discordAccount.id,
              flags: {
                canPubliclyDisplayMessages: true,
              },
            })
          ).rejects.toThrowError();
        },
      });
    });
    it("should succeed all variants updating user server settings as that user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountWithServersCallerCtx(
            server,
            source,
            undefined,
            discordAccount
          );
          const router = userServerSettingsRouter.createCaller(ctx);
          const userServerSettings = await router.update({
            serverId: server.id,
            userId: discordAccount.id,
            flags: {
              canPubliclyDisplayMessages: true,
            },
          });
          expect(userServerSettings).toBeDefined();
          expect(userServerSettings.serverId).toEqual(server.id);
          expect(userServerSettings.userId).toEqual(discordAccount.id);
          expect(userServerSettings.flags.canPubliclyDisplayMessages).toBeTruthy();
        },
      });
    });
  });
  describe("User Server Settings Create With Deps", () => {
    it("should fail all variants creating user server settings as a different user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source);
          const router = userServerSettingsRouter.createCaller(ctx);
          await expect(
            router.createWithDeps({
              serverId: server.id,
              user: discordAccount,
            })
          ).rejects.toThrowError();
        },
      });
    });
    it("should succeed all variants creating user server settings as that user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountWithServersCallerCtx(server, source);
          await createDiscordAccount(account);
          const router = userServerSettingsRouter.createCaller(ctx);
          const userServerSettings = await router.createWithDeps({
            serverId: server.id,
            user: account,
          });
          expect(userServerSettings).toBeDefined();
          expect(userServerSettings.serverId).toEqual(server.id);
          expect(userServerSettings.userId).toEqual(account.id);
        },
      });
    });
  });
  describe("User Server Settings Upsert", () => {
    describe("User Server Settings Upsert Create", () => {
      it("should fail all variants upsert creating user server settings as a different user", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx } = await mockAccountWithServersCallerCtx(server, source);
            const router = userServerSettingsRouter.createCaller(ctx);
            await expect(
              router.upsert({
                serverId: server.id,
                userId: discordAccount.id,
              })
            ).rejects.toThrowError();
          },
        });
      });
      it("should succeed all variants upsert creating user server settings as that user", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx } = await mockAccountWithServersCallerCtx(
              server,
              source,
              undefined,
              discordAccount
            );
            const router = userServerSettingsRouter.createCaller(ctx);
            const userServerSettings = await router.upsert({
              serverId: server.id,
              userId: discordAccount.id,
            });
            expect(userServerSettings).toBeDefined();
            expect(userServerSettings.serverId).toEqual(server.id);
            expect(userServerSettings.userId).toEqual(discordAccount.id);
          },
        });
      });
    });
    describe("User Server Settings Upsert Update", () => {
      it("should fail all variants upsert updating user server settings as a different user", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx, account } = await mockAccountWithServersCallerCtx(server, source);
            const router = userServerSettingsRouter.createCaller(ctx);
            await createDiscordAccount(account);
            await createUserServerSettings({
              serverId: server.id,
              userId: account.id,
            });
            await expect(
              router.upsert({
                serverId: server.id,
                userId: "4",
                flags: {
                  canPubliclyDisplayMessages: true,
                },
              })
            ).rejects.toThrowError();
          },
        });
      });
      it("should succeed all variants upsert updating user server settings as that user", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx, account } = await mockAccountWithServersCallerCtx(
              server,
              source,
              undefined
            );
            await createDiscordAccount(account);
            await createUserServerSettings({
              serverId: server.id,
              userId: account.id,
            });
            const router = userServerSettingsRouter.createCaller(ctx);
            const userServerSettings = await router.upsert({
              serverId: server.id,
              userId: account.id,
              flags: {
                canPubliclyDisplayMessages: true,
              },
            });
            expect(userServerSettings).toBeDefined();
            expect(userServerSettings.serverId).toEqual(server.id);
            expect(userServerSettings.userId).toEqual(account.id);
            expect(userServerSettings.flags.canPubliclyDisplayMessages).toBeTruthy();
          },
        });
      });
    });
  });
  describe("User Server Settings Upsert With Deps", () => {
    describe("User Server Settings Upsert With Deps Create", () => {
      it("should fail all variants upsert creating user server settings as a different user", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx } = await mockAccountWithServersCallerCtx(server, source);
            const router = userServerSettingsRouter.createCaller(ctx);
            await expect(
              router.upsertWithDeps({
                serverId: server.id,
                user: discordAccount,
              })
            ).rejects.toThrowError();
          },
        });
      });
      it("should succeed all variants upsert creating user server settings as that user", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx, account } = await mockAccountWithServersCallerCtx(server, source);
            const router = userServerSettingsRouter.createCaller(ctx);
            const userServerSettings = await router.upsertWithDeps({
              serverId: server.id,
              user: account,
            });
            expect(userServerSettings).toBeDefined();
            expect(userServerSettings.serverId).toEqual(server.id);
            expect(userServerSettings.userId).toEqual(account.id);
          },
        });
      });
    });
    describe("User Server Settings Upsert With Deps Update", () => {
      it("should fail all variants upsert updating user server settings as a different user", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx } = await mockAccountWithServersCallerCtx(server, source);
            const router = userServerSettingsRouter.createCaller(ctx);
            await expect(
              router.upsertWithDeps({
                serverId: server.id,
                user: discordAccount,
                flags: {
                  canPubliclyDisplayMessages: true,
                },
              })
            ).rejects.toThrowError();
          },
        });
      });
      it("should succeed all variants upsert updating user server settings as that user", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx, account } = await mockAccountWithServersCallerCtx(server, source);
            await createDiscordAccount(account);
            await createUserServerSettings({
              serverId: server.id,
              userId: account.id,
            });
            const router = userServerSettingsRouter.createCaller(ctx);
            const userServerSettings = await router.upsertWithDeps({
              serverId: server.id,
              user: account,
              flags: {
                canPubliclyDisplayMessages: true,
              },
            });
            expect(userServerSettings).toBeDefined();
            expect(userServerSettings.serverId).toEqual(server.id);
            expect(userServerSettings.userId).toEqual(account.id);
            expect(userServerSettings.flags.canPubliclyDisplayMessages).toBeTruthy();
          },
        });
      });
    });
  });
});
