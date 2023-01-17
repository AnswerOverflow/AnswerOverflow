import { clearDatabase, Server } from "@answeroverflow/db";
import {
  createAnswerOverflowBotCtx,
  mockAccount,
  mockServer,
  testAllVariants,
} from "~api/test/utils";
import { MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE } from "~api/utils/permissions";
import { pick } from "~api/utils/utils";
import { serverRouter } from "./server";
import type { ServerAll } from "./types";

let manage_guild_router_calling_from_discord: ReturnType<(typeof serverRouter)["createCaller"]>;
let default_member_router_from_bot: ReturnType<(typeof serverRouter)["createCaller"]>;
let answer_overflow_bot_router: ReturnType<(typeof serverRouter)["createCaller"]>;
let server_1: Server;
beforeEach(async () => {
  await clearDatabase();
  server_1 = mockServer();
  const guild_manager = await mockAccount(server_1, "discord-bot", "ManageGuild");
  manage_guild_router_calling_from_discord = serverRouter.createCaller(guild_manager.ctx);
  const default_user = await mockAccount(server_1, "discord-bot");
  default_member_router_from_bot = serverRouter.createCaller(default_user.ctx);
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
        async operation(permission, caller) {
          const server = mockServer();
          const account = await mockAccount(server, permission, caller);
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
        async operation(caller, permission) {
          const server = mockServer();
          await answer_overflow_bot_router.create(server);
          const account = await mockAccount(server, caller, permission);
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
    beforeEach(async () => {
      await answer_overflow_bot_router.create(server_1);
    });
    it("should succeed fetching a server with manage guild", async () => {
      const server = await manage_guild_router_calling_from_discord.byId(server_1.id);
      expect(server as ServerAll).toEqual(server_1);
    });
    it("should succeed fetching a server with default member", async () => {
      const server = await default_member_router_from_bot.byId(server_1.id);
      expect(server).toEqual(pick(server_1, "name", "id", "icon"));
    });
  });

  describe("Server Upsert", () => {
    it("should succeed upserting a new server as a guild manager", async () => {
      const server = await manage_guild_router_calling_from_discord.upsert(server_1);
      expect(server).toEqual(server_1);
      expect(await manage_guild_router_calling_from_discord.byId(server_1.id)).toEqual(server_1);
    });
    it("should succeed upserting an existing server as a guild manager", async () => {
      await manage_guild_router_calling_from_discord.create(server_1);
      const server = await manage_guild_router_calling_from_discord.upsert({
        ...server_1,
        name: "new name",
      });
      expect(server).toEqual({ ...server_1, name: "new name" });
      expect(await manage_guild_router_calling_from_discord.byId(server_1.id)).toEqual({
        ...server_1,
        name: "new name",
      });
    });
    it("should fail upserting a new server as a default member", async () => {
      await expect(default_member_router_from_bot.upsert(server_1)).rejects.toThrow(
        MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE
      );
    });
    it("should fail upserting an existing server as a default member", async () => {
      await manage_guild_router_calling_from_discord.create(server_1);
      await expect(
        default_member_router_from_bot.upsert({ ...server_1, name: "new name" })
      ).rejects.toThrow(MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE);
    });
  });
});
