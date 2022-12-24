import { clearDatabase } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";
import { getGeneralScenario, ServerTestData } from "../test/utils";
import { serverRouter } from "./server";

let manage_guild_router: ReturnType<typeof serverRouter["createCaller"]>;
let default_router: ReturnType<typeof serverRouter["createCaller"]>;
let data: ServerTestData;
beforeEach(async () => {
  const { data: server_data, manage_guild_ctx, default_ctx } = await getGeneralScenario();
  manage_guild_router = serverRouter.createCaller(manage_guild_ctx);
  default_router = serverRouter.createCaller(default_ctx);
  data = server_data;
  await clearDatabase();
});

describe("Server Create", () => {
  it("should succeed creating a server with manage guild", async () => {
    const server = await manage_guild_router.create(data.server);
    expect(server).toEqual(data.server);
  });
  it("should fail creating a server with default permissions", async () => {
    await expect(default_router.create(data.server)).rejects.toThrow(TRPCError);
  });
});

describe("Server Update", () => {
  it("should succeed updating a server with manage guild", async () => {
    await manage_guild_router.create(data.server);
    const server = await manage_guild_router.update({
      id: data.server.id,
      name: "new name",
    });
    expect(server).toEqual({ ...data.server, name: "new name" });
  });
  it("should fail updating a server with default permissions", async () => {
    await manage_guild_router.create(data.server);
    await expect(default_router.update({ id: data.server.id, name: "new name" })).rejects.toThrow(
      TRPCError
    );
  });
});

describe("Server Fetch", () => {
  it("should succeed fetching a server with manage guild", async () => {
    await manage_guild_router.create(data.server);
    const server = await manage_guild_router.byId(data.server.id);
    expect(server).toEqual(data.server);
  });
  it("should fail fetching a server with default permissions", async () => {
    await manage_guild_router.create(data.server);
    await expect(default_router.byId(data.server.id)).rejects.toThrow(TRPCError);
  });
});

describe("Server Upsert", () => {
  it("should succeed upserting a new server with manage guild", async () => {
    const server = await manage_guild_router.upsert({
      create: data.server,
      update: { id: data.server.id, name: "new name" },
    });
    expect(server).toEqual(data.server);
    expect(await manage_guild_router.byId(data.server.id)).toEqual(data.server);
  });
  it("should succeed upserting an existing server with manage guild", async () => {
    await manage_guild_router.create(data.server);
    const server = await manage_guild_router.upsert({
      create: data.server,
      update: { id: data.server.id, name: "new name" },
    });
    expect(server).toEqual({ ...data.server, name: "new name" });
    expect(await manage_guild_router.byId(data.server.id)).toEqual({
      ...data.server,
      name: "new name",
    });
  });
});
