import { clearDatabase, Server } from "@answeroverflow/db";
import {
  createAnswerOverflowBotCtx,
  mockAccountWithCtx,
  mockServer,
  testAllVariants,
} from "~api/test/utils";
import { MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE } from "~api/utils/permissions";
import { pick } from "~api/utils/utils";
import { serverRouter } from "./server";
import type { ServerAll } from "./types";

let manage_guild_router_calling_from_discord: ReturnType<(typeof serverRouter)["createCaller"]>;
let answer_overflow_bot_router: ReturnType<(typeof serverRouter)["createCaller"]>;
let server_1: Server;
beforeEach(async () => {
  await clearDatabase();
  server_1 = mockServer();
  const guild_manager = await mockAccountWithCtx(server_1, "discord-bot", "ManageGuild");
  manage_guild_router_calling_from_discord = serverRouter.createCaller(guild_manager.ctx);
  const ao_bot = await createAnswerOverflowBotCtx();
  answer_overflow_bot_router = serverRouter.createCaller(ao_bot);
});

describe("Server Operations", () => {
  describe("Server Create", () => {
    it("should succeed creating a server as the answer overflow bot", async () => {
      await expect(answer_overflow_bot_router.create(server_1)).resolves.toEqual(server_1);
    });
    it("should succeed creating a server as a guild manager from a discord bot call", async () => {
      await expect(manage_guild_router_calling_from_discord.create(server_1)).resolves.toEqual(
        server_1
      );
    });
    it("should test all permission and caller variants to ensure only calls from the Discord bot with Manage Guild & Administrator can succeed", async () => {
      await testAllVariants({
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        async operation({ permission, source }) {
          const server = mockServer();
          const account = await mockAccountWithCtx(server, source, permission);
          const router = serverRouter.createCaller(account.ctx);
          await router.create(server);
        },
      });
    });
  });

  describe("Server Update", () => {
    it("should succeed updating a guild as the answer overflow bot", async () => {
      await answer_overflow_bot_router.create(server_1);
      const server = await answer_overflow_bot_router.update({
        id: server_1.id,
        name: "new name",
      });
      expect(server).toEqual({ ...server_1, name: "new name" });
    });
    it("should succeed updating a guild as a guild manager calling from a discord bot call", async () => {
      await manage_guild_router_calling_from_discord.create(server_1);
      const server = await manage_guild_router_calling_from_discord.update({
        id: server_1.id,
        name: "new name",
      });
      expect(server).toEqual({ ...server_1, name: "new name" });
    });
    it("should test all permission and caller variants to ensure only calls from the Discord bot with Manage Guild & Administrator can succeed", async () => {
      return await testAllVariants({
        async operation({ source, permission }) {
          const server = mockServer();
          await answer_overflow_bot_router.create(server);
          const account = await mockAccountWithCtx(server, source, permission);
          const router = serverRouter.createCaller(account.ctx);
          await router.update({ id: server.id, name: "new name" });
        },
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
      });
    });
  });

  describe("Server Fetch", () => {
    const server_2 = mockServer({
      kicked_time: new Date(),
    });
    beforeEach(async () => {
      await answer_overflow_bot_router.create(server_2);
    });
    it("should succeed fetching a server with manage guild", async () => {
      const server_2_guild_manager = await mockAccountWithCtx(
        server_2,
        "discord-bot",
        "ManageGuild"
      );
      const router = serverRouter.createCaller(server_2_guild_manager.ctx);
      const server = await router.byId(server_2.id);
      expect(server as ServerAll).toEqual(server_2);
    });
    it("should succeed fetching a server with permission variants", async () => {
      await testAllVariants({
        async operation({ permission, should_permission_succeed, source, should_source_succeed }) {
          const account = await mockAccountWithCtx(server_2, source, permission);
          const router = serverRouter.createCaller(account.ctx);
          const fetched_data = await router.byId(server_2.id);
          if (should_permission_succeed && should_source_succeed) {
            expect(fetched_data as ServerAll).toEqual(server_2);
          } else {
            expect(fetched_data).toEqual(pick(server_2, "name", "id", "icon"));
          }
        },
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        sourcesThatShouldWork: ["discord-bot", "web-client"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator", "AddReactions"],
      });
    });
  });

  describe("Server Upsert", () => {
    it("should succeed upserting a server as the answer overflow bot", async () => {
      await expect(answer_overflow_bot_router.upsert(server_1)).resolves.toEqual(server_1);
    });
    it("should succeed upserting a server as a guild manager from a discord bot call", async () => {
      await expect(manage_guild_router_calling_from_discord.upsert(server_1)).resolves.toEqual(
        server_1
      );
    });
    it("should test all permission and caller variants to ensure only calls from the Discord bot with Manage Guild & Administrator can succeed", async () => {
      await testAllVariants({
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        async operation({ permission, source }) {
          const server = mockServer();
          const account = await mockAccountWithCtx(server, source, permission);
          const router = serverRouter.createCaller(account.ctx);
          await router.upsert(server);
        },
      });
    });
  });
});
