import {
  createAnswerOverflowBotCtx,
  mockAccountWithServersCallerCtx,
  testAllSources,
} from "~api/test/utils";
import { serverRouter } from "../server/server";

import type { Server, DiscordAccount } from "@answeroverflow/db";
import { userServerSettingsRouter } from "./user-server-settings";
import { discordAccountRouter } from "../users/accounts/discord-accounts";
import { mockAccount, mockServer } from "@answeroverflow/db-mock";

let ao_bot_server_router: ReturnType<(typeof serverRouter)["createCaller"]>;
let ao_bot_discord_account_router: ReturnType<(typeof discordAccountRouter)["createCaller"]>;
let ao_bot_user_server_settings_router: ReturnType<
  (typeof userServerSettingsRouter)["createCaller"]
>;

let server: Server;
let discord_account: DiscordAccount;
let discord_account_2: DiscordAccount;
beforeEach(async () => {
  server = mockServer();
  discord_account = mockAccount();
  discord_account_2 = mockAccount();
  const ao_bot = await createAnswerOverflowBotCtx();
  ao_bot_server_router = serverRouter.createCaller(ao_bot);
  ao_bot_discord_account_router = discordAccountRouter.createCaller(ao_bot);
  ao_bot_user_server_settings_router = userServerSettingsRouter.createCaller(ao_bot);
  await ao_bot_server_router.create(server);
  await ao_bot_discord_account_router.create(discord_account);
  await ao_bot_discord_account_router.create(discord_account_2);
});

describe("User Server Settings Operations", () => {
  describe("User Server Settings By Id", () => {
    beforeEach(async () => {
      await ao_bot_user_server_settings_router.create({
        server_id: server.id,
        user_id: discord_account.id,
      });
    });
    it("should succeed getting user server settings by id as the ao bot", async () => {
      const user_server_settings = await ao_bot_user_server_settings_router.byId({
        server_id: server.id,
        user_id: discord_account.id,
      });
      expect(user_server_settings).toBeDefined();
      expect(user_server_settings?.server_id).toEqual(server.id);
      expect(user_server_settings?.user_id).toEqual(discord_account.id);
    });
    it("should fail all varaints getting user server settings by id as a different user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source);
          const router = userServerSettingsRouter.createCaller(ctx);
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
          const router = userServerSettingsRouter.createCaller(ctx);
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
  describe("User Server Settings By Id Many", () => {
    beforeEach(async () => {
      await ao_bot_user_server_settings_router.create({
        server_id: server.id,
        user_id: discord_account.id,
      });
      await ao_bot_user_server_settings_router.create({
        server_id: server.id,
        user_id: discord_account_2.id,
      });
    });
    it("should succeed getting user server settings by id many as the ao bot", async () => {
      const user_server_settings = await ao_bot_user_server_settings_router.byIdMany([
        {
          server_id: server.id,
          user_id: discord_account.id,
        },
        {
          server_id: server.id,
          user_id: discord_account_2.id,
        },
      ]);
      expect(user_server_settings).toBeDefined();
      expect(user_server_settings.length).toEqual(2);
    });
    it("should fail all varaints getting user server settings by id many as a different user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source);
          const router = userServerSettingsRouter.createCaller(ctx);
          await expect(
            router.byIdMany([
              {
                server_id: server.id,
                user_id: discord_account.id,
              },
              {
                server_id: server.id,
                user_id: discord_account_2.id,
              },
            ])
          ).rejects.toThrowError();
        },
      });
    });
    it("should succeed all variants getting user server settings by id many as that user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountWithServersCallerCtx(
            server,
            source,
            undefined,
            discord_account
          );
          const router = userServerSettingsRouter.createCaller(ctx);
          const user_server_settings = await router.byIdMany([
            {
              server_id: server.id,
              user_id: discord_account.id,
            },
          ]);
          expect(user_server_settings).toBeDefined();
          expect(user_server_settings.length).toEqual(1);
        },
      });
    });
  });
  describe("User Server Settings Create", () => {
    it("should succeed creating user server settings as the ao bot", async () => {
      const user_server_settings = await ao_bot_user_server_settings_router.create({
        server_id: server.id,
        user_id: discord_account.id,
      });
      expect(user_server_settings).toBeDefined();
      expect(user_server_settings.server_id).toEqual(server.id);
      expect(user_server_settings.user_id).toEqual(discord_account.id);
    });
    it("should fail all variants creating user server settings as a different user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source);
          const router = userServerSettingsRouter.createCaller(ctx);
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
          await ao_bot_discord_account_router.create(account);
          const router = userServerSettingsRouter.createCaller(ctx);
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
      await ao_bot_user_server_settings_router.create({
        server_id: server.id,
        user_id: discord_account.id,
      });
    });
    it("should succeed updating user server settings as the ao bot", async () => {
      const user_server_settings = await ao_bot_user_server_settings_router.update({
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
      const settings2 = await ao_bot_user_server_settings_router.update({
        server_id: server.id,
        user_id: discord_account.id,
        flags: {
          can_publicly_display_messages: true,
        },
      });
      expect(settings2).toBeDefined();
      expect(settings2.server_id).toEqual(server.id);
      expect(settings2.user_id).toEqual(discord_account.id);
      expect(settings2.flags.can_publicly_display_messages).toBeTruthy();
    });
    it("should fail all variants updating user server settings as a different user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source);
          const router = userServerSettingsRouter.createCaller(ctx);
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
          const router = userServerSettingsRouter.createCaller(ctx);
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
    it("should succeed creating user server settings as the ao bot", async () => {
      const user_server_settings = await ao_bot_user_server_settings_router.createWithDeps({
        server_id: server.id,
        user: discord_account,
      });
      expect(user_server_settings).toBeDefined();
      expect(user_server_settings.server_id).toEqual(server.id);
      expect(user_server_settings.user_id).toEqual(discord_account.id);
    });
    it("should fail all variants creating user server settings as a different user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source);
          const router = userServerSettingsRouter.createCaller(ctx);
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
          await ao_bot_discord_account_router.create(account);
          const router = userServerSettingsRouter.createCaller(ctx);
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
      it("should succeed upsert creating user server settings as the ao bot", async () => {
        const user_server_settings = await ao_bot_user_server_settings_router.upsert({
          server_id: server.id,
          user_id: discord_account.id,
        });
        expect(user_server_settings).toBeDefined();
        expect(user_server_settings.server_id).toEqual(server.id);
        expect(user_server_settings.user_id).toEqual(discord_account.id);
      });
      it("should fail all variants upsert creating user server settings as a different user", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx } = await mockAccountWithServersCallerCtx(server, source);
            const router = userServerSettingsRouter.createCaller(ctx);
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
            const router = userServerSettingsRouter.createCaller(ctx);
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
      it("should succeed upsert updating user server settings as the ao bot", async () => {
        const user_server_settings = await ao_bot_user_server_settings_router.upsert({
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
      });
      it("should fail all variants upsert updating user server settings as a different user", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx } = await mockAccountWithServersCallerCtx(server, source);
            const router = userServerSettingsRouter.createCaller(ctx);
            await expect(
              router.upsert({
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
      it("should succeed all variants upsert updating user server settings as that user", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx } = await mockAccountWithServersCallerCtx(
              server,
              source,
              undefined,
              discord_account
            );
            const router = userServerSettingsRouter.createCaller(ctx);
            const user_server_settings = await router.upsert({
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
  });
  describe("User Server Settings Upsert With Deps", () => {
    describe("User Server Settings Upsert With Deps Create", () => {
      it("should succeed upsert creating user server settings as the ao bot", async () => {
        const user_server_settings = await ao_bot_user_server_settings_router.upsertWithDeps({
          server_id: server.id,
          user: discord_account,
        });
        expect(user_server_settings).toBeDefined();
        expect(user_server_settings.server_id).toEqual(server.id);
        expect(user_server_settings.user_id).toEqual(discord_account.id);
      });
      it("should fail all variants upsert creating user server settings as a different user", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx } = await mockAccountWithServersCallerCtx(server, source);
            const router = userServerSettingsRouter.createCaller(ctx);
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
            await ao_bot_discord_account_router.create(account);
            const router = userServerSettingsRouter.createCaller(ctx);
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
      it("should succeed upsert updating user server settings as the ao bot", async () => {
        const user_server_settings = await ao_bot_user_server_settings_router.upsertWithDeps({
          server_id: server.id,
          user: discord_account,
          flags: {
            can_publicly_display_messages: true,
          },
        });
        expect(user_server_settings).toBeDefined();
        expect(user_server_settings.server_id).toEqual(server.id);
        expect(user_server_settings.user_id).toEqual(discord_account.id);
        expect(user_server_settings.flags.can_publicly_display_messages).toBeTruthy();
      });
      it("should fail all variants upsert updating user server settings as a different user", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx } = await mockAccountWithServersCallerCtx(server, source);
            const router = userServerSettingsRouter.createCaller(ctx);
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
            await ao_bot_discord_account_router.create(account);
            const router = userServerSettingsRouter.createCaller(ctx);
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
