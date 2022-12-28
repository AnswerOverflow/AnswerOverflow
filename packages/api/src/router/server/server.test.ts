import { clearDatabase } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";
import { getGeneralScenario, ServerTestData } from "~api/test/utils";
import { serverRouter } from "./server";

let manage_guild_router: ReturnType<typeof serverRouter["createCaller"]>;
let default_router: ReturnType<typeof serverRouter["createCaller"]>;
let server1: ServerTestData;
beforeEach(async () => {
  const { data1 } = await getGeneralScenario();
  manage_guild_router = serverRouter.createCaller(data1.manage_guild_ctx);
  default_router = serverRouter.createCaller(data1.default_ctx);
  server1 = data1;
  await clearDatabase();
});

describe("Server Create", () => {
  it("should succeed creating a server with manage guild", async () => {
    const server = await manage_guild_router.create(server1.server);
    expect(server).toEqual(server1.server);
  });
  it("should fail creating a server with default permissions", async () => {
    await expect(default_router.create(server1.server)).rejects.toThrow(TRPCError);
  });
});

describe("Server Update", () => {
  it("should succeed updating a server with manage guild", async () => {
    await manage_guild_router.create(server1.server);
    const server = await manage_guild_router.update({
      id: server1.server.id,
      name: "new name",
    });
    expect(server).toEqual({ ...server1.server, name: "new name" });
  });
  it("should fail updating a server with default permissions", async () => {
    await manage_guild_router.create(server1.server);
    await expect(
      default_router.update({ id: server1.server.id, name: "new name" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("Server Fetch", () => {
  it("should succeed fetching a server with manage guild", async () => {
    await manage_guild_router.create(server1.server);
    const server = await manage_guild_router.byId(server1.server.id);
    expect(server).toEqual(server1.server);
  });
  it("should fail fetching a server with default permissions", async () => {
    await manage_guild_router.create(server1.server);
    await expect(default_router.byId(server1.server.id)).rejects.toThrow(TRPCError);
  });
});

describe("Server Upsert", () => {
  it("should succeed upserting a new server with manage guild", async () => {
    const server = await manage_guild_router.upsert({
      create: server1.server,
      update: { id: server1.server.id, name: "new name" },
    });
    expect(server).toEqual(server1.server);
    expect(await manage_guild_router.byId(server1.server.id)).toEqual(server1.server);
  });
  it("should succeed upserting an existing server with manage guild", async () => {
    await manage_guild_router.create(server1.server);
    const server = await manage_guild_router.upsert({
      create: server1.server,
      update: { id: server1.server.id, name: "new name" },
    });
    expect(server).toEqual({ ...server1.server, name: "new name" });
    expect(await manage_guild_router.byId(server1.server.id)).toEqual({
      ...server1.server,
      name: "new name",
    });
  });
});
