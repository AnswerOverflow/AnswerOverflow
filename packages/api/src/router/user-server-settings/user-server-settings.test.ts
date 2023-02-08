import { mockAccountWithServersCallerCtx, testAllSources } from "~api/test/utils";
import {
  Server,
  DiscordAccount,
  createServer,
  createDiscordAccount,
  createUserServerSettings,
} from "@answeroverflow/db";
import { user_server_settings_router } from "./user-server-settings";
import { mockDiscordAccount, mockServer } from "@answeroverflow/db-mock";

let server: Server;
let discord_account: DiscordAccount;
let discord_account_2: DiscordAccount;
beforeEach(async () => {
  server = mockServer();
  discord_account = mockDiscordAccount();
  discord_account_2 = mockDiscordAccount();

  await createServer(server);
  await createDiscordAccount(discord_account);
  await createDiscordAccount(discord_account_2);
});

describe("User Server Settings Operations", () => {
  describe("User Server Settings By Id", () => {
    beforeEach(async () => {
      await createUserServerSettings({
        server_id: server.id,
        user_id: discord_account.id,
      });
    });
    it("should fail all varaints getting user server settings by id as a different user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source);
          const router = user_server_settings_router.createCaller(ctx);
          await expect(
            router.byId({
              server_id: server.id,
              user_id: discord_account.id,
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
            discord_account
          );
          const router = user_server_settings_router.createCaller(ctx);
          const user_server_settings = await router.byId({
            server_id: server.id,
            user_id: discord_account.id,
          });
          expect(user_server_settings).toBeDefined();
          expect(user_server_settings?.server_id).toEqual(server.id);
          expect(user_server_settings?.user_id).toEqual(discord_account.id);
        },
      });
    });
  });
  describe("User Server Settings Create", () => {
    it("should fail all variants creating user server settings as a different user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source);
          const router = user_server_settings_router.createCaller(ctx);
          await expect(
            router.create({
              server_id: server.id,
              user_id: discord_account.id,
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
          const router = user_server_settings_router.createCaller(ctx);
          const user_server_settings = await router.create({
            server_id: server.id,
            user_id: account.id,
          });
          expect(user_server_settings).toBeDefined();
          expect(user_server_settings.server_id).toEqual(server.id);
          expect(user_server_settings.user_id).toEqual(account.id);
        },
      });
    });
  });
  describe("User Server Settings Update", () => {
    beforeEach(async () => {
      await createUserServerSettings({
        server_id: server.id,
        user_id: discord_account.id,
      });
    });
    it("should fail all variants updating user server settings as a different user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source);
          const router = user_server_settings_router.createCaller(ctx);
          await expect(
            router.update({
              server_id: server.id,
              user_id: discord_account.id,
              flags: {
                can_publicly_display_messages: true,
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
            discord_account
          );
          const router = user_server_settings_router.createCaller(ctx);
          const user_server_settings = await router.update({
            server_id: server.id,
            user_id: discord_account.id,
            flags: {
              can_publicly_display_messages: true,
            },
          });
          expect(user_server_settings).toBeDefined();
          expect(user_server_settings.server_id).toEqual(server.id);
          expect(user_server_settings.user_id).toEqual(discord_account.id);
          expect(user_server_settings.flags.can_publicly_display_messages).toBeTruthy();
        },
      });
    });
  });
  describe("User Server Settings Create With Deps", () => {
    it("should fail all variants creating user server settings as a different user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source);
          const router = user_server_settings_router.createCaller(ctx);
          await expect(
            router.createWithDeps({
              server_id: server.id,
              user: discord_account,
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
          const router = user_server_settings_router.createCaller(ctx);
          const user_server_settings = await router.createWithDeps({
            server_id: server.id,
            user: account,
          });
          expect(user_server_settings).toBeDefined();
          expect(user_server_settings.server_id).toEqual(server.id);
          expect(user_server_settings.user_id).toEqual(account.id);
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
            const router = user_server_settings_router.createCaller(ctx);
            await expect(
              router.upsert({
                server_id: server.id,
                user_id: discord_account.id,
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
              discord_account
            );
            const router = user_server_settings_router.createCaller(ctx);
            const user_server_settings = await router.upsert({
              server_id: server.id,
              user_id: discord_account.id,
            });
            expect(user_server_settings).toBeDefined();
            expect(user_server_settings.server_id).toEqual(server.id);
            expect(user_server_settings.user_id).toEqual(discord_account.id);
          },
        });
      });
    });
    describe("User Server Settings Upsert Update", () => {
      it("should fail all variants upsert updating user server settings as a different user", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx, account } = await mockAccountWithServersCallerCtx(server, source);
            const router = user_server_settings_router.createCaller(ctx);
            await createDiscordAccount(account);
            await createUserServerSettings({
              server_id: server.id,
              user_id: account.id,
            });
            await expect(
              router.upsert({
                server_id: server.id,
                user_id: "4",
                flags: {
                  can_publicly_display_messages: true,
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
              server_id: server.id,
              user_id: account.id,
            });
            const router = user_server_settings_router.createCaller(ctx);
            const user_server_settings = await router.upsert({
              server_id: server.id,
              user_id: account.id,
              flags: {
                can_publicly_display_messages: true,
              },
            });
            expect(user_server_settings).toBeDefined();
            expect(user_server_settings.server_id).toEqual(server.id);
            expect(user_server_settings.user_id).toEqual(account.id);
            expect(user_server_settings.flags.can_publicly_display_messages).toBeTruthy();
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
            const router = user_server_settings_router.createCaller(ctx);
            await expect(
              router.upsertWithDeps({
                server_id: server.id,
                user: discord_account,
              })
            ).rejects.toThrowError();
          },
        });
      });
      it("should succeed all variants upsert creating user server settings as that user", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx, account } = await mockAccountWithServersCallerCtx(server, source);
            const router = user_server_settings_router.createCaller(ctx);
            const user_server_settings = await router.upsertWithDeps({
              server_id: server.id,
              user: account,
            });
            expect(user_server_settings).toBeDefined();
            expect(user_server_settings.server_id).toEqual(server.id);
            expect(user_server_settings.user_id).toEqual(account.id);
          },
        });
      });
    });
    describe("User Server Settings Upsert With Deps Update", () => {
      it("should fail all variants upsert updating user server settings as a different user", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx } = await mockAccountWithServersCallerCtx(server, source);
            const router = user_server_settings_router.createCaller(ctx);
            await expect(
              router.upsertWithDeps({
                server_id: server.id,
                user: discord_account,
                flags: {
                  can_publicly_display_messages: true,
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
              server_id: server.id,
              user_id: account.id,
            });
            const router = user_server_settings_router.createCaller(ctx);
            const user_server_settings = await router.upsertWithDeps({
              server_id: server.id,
              user: account,
              flags: {
                can_publicly_display_messages: true,
              },
            });
            expect(user_server_settings).toBeDefined();
            expect(user_server_settings.server_id).toEqual(server.id);
            expect(user_server_settings.user_id).toEqual(account.id);
            expect(user_server_settings.flags.can_publicly_display_messages).toBeTruthy();
          },
        });
      });
    });
  });
});
