import { createServer, createServerSettings, Server } from "@answeroverflow/db";
import { mockServer } from "@answeroverflow/db-mock";
import { mockAccountWithServersCallerCtx, testAllVariantsThatThrowErrors } from "~api/test/utils";
import { serverSettingsRouter } from "./server_settings";

let server: Server;
beforeEach(async () => {
  server = mockServer();
  await createServer(server);
});

describe("Server Settings Operations", () => {
  describe("Server Settings By Id", () => {
    beforeEach(async () => {
      await createServerSettings({ server_id: server.id });
    });
    it("should test all varaints of getting server settings by id", async () => {
      await testAllVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = serverSettingsRouter.createCaller(ctx);
          await router.byId(server.id);
        },
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        sourcesThatShouldWork: ["discord-bot", "web-client"],
      });
    });
  });
  describe("Server Settings Create", () => {
    it("should test all varaints of creating server settings", async () => {
      await testAllVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const srv = mockServer();
          await createServer(srv);
          const { ctx } = await mockAccountWithServersCallerCtx(srv, source, permission);
          const router = serverSettingsRouter.createCaller(ctx);
          await router.create({ server_id: srv.id });
        },
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        sourcesThatShouldWork: ["discord-bot"],
      });
    });
  });
  describe("Server Settings Update", () => {
    beforeEach(async () => {
      await createServerSettings({ server_id: server.id });
    });
    it("should test all varaints of updating server settings", async () => {
      await testAllVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const { ctx } = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = serverSettingsRouter.createCaller(ctx);
          await router.update({
            server_id: server.id,
            flags: { read_the_rules_consent_enabled: true },
          });
        },
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        sourcesThatShouldWork: ["discord-bot"],
      });
    });
  });
  describe("Server Settings Create With Deps", () => {
    it("should test all varaints of creating server settings with deps", async () => {
      await testAllVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const srv = mockServer();
          await createServer(srv);
          const { ctx } = await mockAccountWithServersCallerCtx(srv, source, permission);
          const router = serverSettingsRouter.createCaller(ctx);
          await router.createWithDeps({ server: srv });
        },
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        sourcesThatShouldWork: ["discord-bot"],
      });
    });
  });
  describe("Server Settings Upsert", () => {
    describe("Server Settings Upsert Create", () => {
      it("should test all varaints of upserting create server settings", async () => {
        await testAllVariantsThatThrowErrors({
          async operation({ source, permission }) {
            const srv = mockServer();
            await createServer(srv);
            const { ctx } = await mockAccountWithServersCallerCtx(srv, source, permission);
            const router = serverSettingsRouter.createCaller(ctx);
            await router.upsert({ server_id: srv.id });
          },
          permissionsThatShouldWork: ["ManageGuild", "Administrator"],
          sourcesThatShouldWork: ["discord-bot"],
        });
      });
    });
    describe("Server Settings Upsert Update", () => {
      beforeEach(async () => {
        await createServerSettings({ server_id: server.id });
      });

      it("should test all varaints of upserting updating server settings", async () => {
        await testAllVariantsThatThrowErrors({
          async operation({ source, permission }) {
            const { ctx } = await mockAccountWithServersCallerCtx(server, source, permission);
            const router = serverSettingsRouter.createCaller(ctx);
            await router.upsert({
              server_id: server.id,
              flags: { read_the_rules_consent_enabled: true },
            });
          },
          permissionsThatShouldWork: ["ManageGuild", "Administrator"],
          sourcesThatShouldWork: ["discord-bot"],
        });
      });
    });
  });
  describe("Server Settings Upsert With Deps", () => {
    describe("Server Settings Upsert With Deps Create", () => {
      it("should test all varaints of upserting create server settings with deps", async () => {
        await testAllVariantsThatThrowErrors({
          async operation({ source, permission }) {
            const srv = mockServer();
            await createServer(srv);
            const { ctx } = await mockAccountWithServersCallerCtx(srv, source, permission);
            const router = serverSettingsRouter.createCaller(ctx);
            await router.upsertWithDeps({ server: srv });
          },
          permissionsThatShouldWork: ["ManageGuild", "Administrator"],
          sourcesThatShouldWork: ["discord-bot"],
        });
      });
    });
    describe("Server Settings Upsert With Deps Update", () => {
      beforeEach(async () => {
        await createServerSettings({ server_id: server.id });
      });
      it("should test all varaints of upserting updating server settings with deps", async () => {
        await testAllVariantsThatThrowErrors({
          async operation({ source, permission }) {
            const { ctx } = await mockAccountWithServersCallerCtx(server, source, permission);
            const router = serverSettingsRouter.createCaller(ctx);
            await router.upsertWithDeps({
              server: server,
              flags: { read_the_rules_consent_enabled: true },
            });
          },
          permissionsThatShouldWork: ["ManageGuild", "Administrator"],
          sourcesThatShouldWork: ["discord-bot"],
        });
      });
    });
  });
});
