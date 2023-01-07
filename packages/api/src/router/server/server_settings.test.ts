import { clearDatabase, Server } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";
import { getGeneralScenario, ServerTestData } from "~api/test/utils";
import { MISSING_PERMISSIONS_MESSAGE } from "~api/utils/permissions";
import { serverSettingsRouter } from "./server_settings";

// eslint-disable-next-line no-unused-vars
let data: ServerTestData;
let server_settings_router_manage_guild: ReturnType<typeof serverSettingsRouter["createCaller"]>;
let server_settings_no_permissions: ReturnType<typeof serverSettingsRouter["createCaller"]>;
let server: Server;
beforeEach(async () => {
  const { data1 } = await getGeneralScenario();
  data = data1;
  server_settings_router_manage_guild = serverSettingsRouter.createCaller(data1.manage_guild_ctx);
  server_settings_no_permissions = serverSettingsRouter.createCaller(data1.default_ctx);
  server = data1.server;
  await clearDatabase();
});

describe("Server Settings Operations", () => {
  describe("Server Settings Find", () => {
    it("should find server settings by id", async () => {
      await server_settings_router_manage_guild.createWithDeps({ server });
      const server_settings = await server_settings_router_manage_guild.byId(server.id);
      expect(server_settings).toBeDefined();
    });

    it("should throw error if server settings not found", async () => {
      await expect(server_settings_router_manage_guild.byId("1241")).rejects.toThrow(TRPCError);
    });
    it("should try to fetch server settings without permission", async () => {
      await server_settings_router_manage_guild.createWithDeps({ server });
      await expect(server_settings_no_permissions.byId(server.id)).rejects.toThrow(
        MISSING_PERMISSIONS_MESSAGE
      );
    });
  });

  describe("Server Settings Create", () => {
    it("should create server settings with manage guild permissions", async () => {
      const server_settings = await server_settings_router_manage_guild.createWithDeps({ server });
      expect(server_settings).toBeDefined();
    });
    it("should try to create server settings without manage guild permissions", async () => {
      await expect(server_settings_no_permissions.createWithDeps({ server })).rejects.toThrow(
        MISSING_PERMISSIONS_MESSAGE
      );
    });
  });

  describe("Server Settings Update", () => {
    beforeEach(async () => {
      await server_settings_router_manage_guild.createWithDeps({ server });
    });
    it("should update server settings with manage guild permissions", async () => {
      const server_settings = await server_settings_router_manage_guild.update({
        server_id: server.id,
        flags: {
          read_the_rules_consent_enabled: true,
        },
      });
      expect(server_settings).toBeDefined();
      const updated = await server_settings_router_manage_guild.byId(server.id);
      expect(updated?.flags.read_the_rules_consent_enabled).toBe(true);
    });
    it("should try to update server settings without manage guild permissions", async () => {
      await expect(
        server_settings_no_permissions.update({
          server_id: server.id,
          flags: {
            read_the_rules_consent_enabled: true,
          },
        })
      ).rejects.toThrow(MISSING_PERMISSIONS_MESSAGE);
    });
  });

  describe("Server Settings Create With Deps", () => {
    it("should create server settings with manage guild permissions", async () => {
      const server_settings = await server_settings_router_manage_guild.createWithDeps({ server });
      expect(server_settings).toBeDefined();
    });
    it("should try to create server settings without manage guild permissions", async () => {
      await expect(server_settings_no_permissions.createWithDeps({ server })).rejects.toThrow(
        MISSING_PERMISSIONS_MESSAGE
      );
    });
  });

  describe("Server Settings Upsert", () => {
    it("should upsert new server settings with manage guild permissions", async () => {
      const server_settings = await server_settings_router_manage_guild.upsert({
        server_id: server.id,
        flags: {
          read_the_rules_consent_enabled: true,
        },
      });
      expect(server_settings).toBeDefined();
      const updated = await server_settings_router_manage_guild.byId(server.id);
      expect(updated?.flags.read_the_rules_consent_enabled).toBe(true);
    });
    it("should upsert existing server settings with manage guild permissions", async () => {
      await server_settings_router_manage_guild.createWithDeps({ server });
      const server_settings = await server_settings_router_manage_guild.upsert({
        server_id: server.id,
        flags: {
          read_the_rules_consent_enabled: true,
        },
      });
      expect(server_settings).toBeDefined();
      const updated = await server_settings_router_manage_guild.byId(server.id);
      expect(updated?.flags.read_the_rules_consent_enabled).toBe(true);
    });
    it("should try to upsert server settings without manage guild permissions", async () => {
      await expect(
        server_settings_no_permissions.upsert({
          server_id: server.id,
          flags: {
            read_the_rules_consent_enabled: true,
          },
        })
      ).rejects.toThrow(MISSING_PERMISSIONS_MESSAGE);
    });
  });
});
