import { clearDatabase, Server } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";
import { getGeneralScenario, ServerTestData } from "~api/test/utils";
import { serverRouter } from "./server";

let manage_guild_router: ReturnType<typeof serverRouter["createCaller"]>;
let default_router: ReturnType<typeof serverRouter["createCaller"]>;
let test_data_1: ServerTestData;
let server_1: Server;
beforeEach(async () => {
  const { data1 } = await getGeneralScenario();
  test_data_1 = data1;
  manage_guild_router = serverRouter.createCaller(test_data_1.manage_guild_ctx);
  default_router = serverRouter.createCaller(test_data_1.default_ctx);
  server_1 = test_data_1.server;
  await clearDatabase();
});

describe("Server Operations", () => {
  describe("Server Create", () => {
    it("should succeed creating a server with manage guild", async () => {
      const server = await manage_guild_router.create(server_1);
      expect(server).toEqual(server_1);
    });
    it("should fail creating a server with default permissions", async () => {
      await expect(default_router.create(server_1)).rejects.toThrow(TRPCError);
    });
  });

  describe("Server Update", () => {
    it("should succeed updating a server with manage guild", async () => {
      await manage_guild_router.create(server_1);
      const server = await manage_guild_router.update({
        id: server_1.id,
        name: "new name",
      });
      expect(server).toEqual({ ...server_1, name: "new name" });
    });
    it("should fail updating a server with default permissions", async () => {
      await manage_guild_router.create(server_1);
      await expect(default_router.update({ id: server_1.id, name: "new name" })).rejects.toThrow(
        TRPCError
      );
    });
  });

  describe("Server Fetch", () => {
    it("should succeed fetching a server with manage guild", async () => {
      await manage_guild_router.create(server_1);
      const server = await manage_guild_router.byId(server_1.id);
      expect(server).toEqual(server_1);
    });
    it("should fail fetching a server with default permissions", async () => {
      await manage_guild_router.create(server_1);
      await expect(default_router.byId(server_1.id)).rejects.toThrow(TRPCError);
    });
  });

  describe("Server Upsert", () => {
    it("should succeed upserting a new server with manage guild", async () => {
      const server = await manage_guild_router.upsert(server_1);
      expect(server).toEqual(server_1);
      expect(await manage_guild_router.byId(server_1.id)).toEqual(server_1);
    });
    it("should succeed upserting an existing server with manage guild", async () => {
      await manage_guild_router.create(server_1);
      const server = await manage_guild_router.upsert({ ...server_1, name: "new name" });
      expect(server).toEqual({ ...server_1, name: "new name" });
      expect(await manage_guild_router.byId(server_1.id)).toEqual({
        ...server_1,
        name: "new name",
      });
    });
  });
});
