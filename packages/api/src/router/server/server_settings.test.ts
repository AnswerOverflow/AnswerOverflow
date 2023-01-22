import { clearDatabase, Server } from "@answeroverflow/db";
import {
  createAnswerOverflowBotCtx,
  mockAccountWithServersCallerCtx,
  mockServer,
  testAllVariantsThatThrowErrors,
} from "~api/test/utils";
import { serverRouter } from "./server";
import { serverSettingsRouter } from "./server_settings";

let answer_overflow_bot_server_router: ReturnType<(typeof serverRouter)["createCaller"]>;
let answer_overflow_bot_server_settings_router: ReturnType<
  (typeof serverSettingsRouter)["createCaller"]
>;
let server: Server;
beforeEach(async () => {
  await clearDatabase();
  server = mockServer();
  const ao_bot = await createAnswerOverflowBotCtx();
  answer_overflow_bot_server_router = serverRouter.createCaller(ao_bot);
  answer_overflow_bot_server_settings_router = serverSettingsRouter.createCaller(ao_bot);
  await answer_overflow_bot_server_router.create(server);
});

describe("Server Settings Operations", () => {
  describe("Server Settings By Id", () => {
    beforeEach(async () => {
      await answer_overflow_bot_server_settings_router.create({ server_id: server.id });
    });
    it("should succeed getting a server settings by id as the answer overflow bot", async () => {
      const found = await answer_overflow_bot_server_settings_router.byId(server.id);
      expect(found).toBeDefined();
      expect(found.server_id).toEqual(server.id);
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
    it("should succeed creating a server settings as the answer overflow bot", async () => {
      const created = await answer_overflow_bot_server_settings_router.create({
        server_id: server.id,
      });
      expect(created).toBeDefined();
      expect(created.server_id).toEqual(server.id);
    });
    it("should test all varaints of creating server settings", async () => {
      await testAllVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const srv = mockServer();
          await answer_overflow_bot_server_router.create(srv);
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
      await answer_overflow_bot_server_settings_router.create({ server_id: server.id });
    });
    it("should succeed updating a server settings as the answer overflow bot", async () => {
      const updated = await answer_overflow_bot_server_settings_router.update({
        server_id: server.id,
        flags: { read_the_rules_consent_enabled: true },
      });
      expect(updated).toBeDefined();
      expect(updated.server_id).toEqual(server.id);
      expect(updated.flags.read_the_rules_consent_enabled).toBeTruthy();
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
    it("should succeed creating a server settings with deps as the answer overflow bot", async () => {
      const srv = mockServer();
      const created = await answer_overflow_bot_server_settings_router.createWithDeps({
        server: srv,
      });
      expect(created).toBeDefined();
      expect(created.server_id).toEqual(srv.id);
    });
    it("should test all varaints of creating server settings with deps", async () => {
      await testAllVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const srv = mockServer();
          await answer_overflow_bot_server_router.create(srv);
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
      it("should succeed upserting creating a server settings as the answer overflow bot", async () => {
        const upserted = await answer_overflow_bot_server_settings_router.upsert({
          server_id: server.id,
        });
        expect(upserted).toBeDefined();
        expect(upserted.server_id).toEqual(server.id);
      });
      it("should test all varaints of upserting create server settings", async () => {
        await testAllVariantsThatThrowErrors({
          async operation({ source, permission }) {
            const srv = mockServer();
            await answer_overflow_bot_server_router.create(srv);
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
        await answer_overflow_bot_server_settings_router.create({ server_id: server.id });
      });
      it("should succeed upserting updating a server settings as the answer overflow bot", async () => {
        const upserted = await answer_overflow_bot_server_settings_router.upsert({
          server_id: server.id,
          flags: { read_the_rules_consent_enabled: true },
        });
        expect(upserted).toBeDefined();
        expect(upserted.server_id).toEqual(server.id);
        expect(upserted.flags.read_the_rules_consent_enabled).toBeTruthy();
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
      it("should succeed upserting creating a server settings with deps as the answer overflow bot", async () => {
        const srv = mockServer();
        const upserted = await answer_overflow_bot_server_settings_router.upsertWithDeps({
          server: srv,
        });
        expect(upserted).toBeDefined();
        expect(upserted.server_id).toEqual(srv.id);
      });
      it("should test all varaints of upserting create server settings with deps", async () => {
        await testAllVariantsThatThrowErrors({
          async operation({ source, permission }) {
            const srv = mockServer();
            await answer_overflow_bot_server_router.create(srv);
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
        await answer_overflow_bot_server_settings_router.create({ server_id: server.id });
      });
      it("should succeed upserting updating a server settings with deps as the answer overflow bot", async () => {
        const upserted = await answer_overflow_bot_server_settings_router.upsertWithDeps({
          server: server,
          flags: { read_the_rules_consent_enabled: true },
        });
        expect(upserted).toBeDefined();
        expect(upserted.server_id).toEqual(server.id);
        expect(upserted.flags.read_the_rules_consent_enabled).toBeTruthy();
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
