import { clearDatabase } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";
import { type ServerTestData, getGeneralScenario } from "../test/utils";
import { channelRouter } from "./channel";
import { serverRouter } from "./server";

let manage_guild_router: ReturnType<typeof serverRouter["createCaller"]>;
let manage_channel_router: ReturnType<typeof channelRouter["createCaller"]>;
let default_channel_router: ReturnType<typeof channelRouter["createCaller"]>;
let data: ServerTestData;
beforeEach(async () => {
  const { data: server_data, manage_guild_ctx, default_ctx } = await getGeneralScenario();
  manage_guild_router = serverRouter.createCaller(manage_guild_ctx);
  manage_channel_router = channelRouter.createCaller(manage_guild_ctx);
  default_channel_router = channelRouter.createCaller(default_ctx);
  data = server_data;
  await clearDatabase();
});

describe("Channel Create", () => {
  it("should succeed creating a channel with manage guild", async () => {
    await manage_guild_router.create(data.server);
    const channel = await manage_channel_router.create(data.channels[0]);
    expect(channel).toEqual(data.channels[0]);
  });
  it("should fail creating a channel with default permissions", async () => {
    await manage_guild_router.create(data.server);
    await expect(default_channel_router.create(data.channels[0])).rejects.toThrow(TRPCError);
  });
  it("should create a channel with dependencies", async () => {
    const channel = await manage_channel_router.createWithDeps({
      channel: {
        ...data.channels[0],
      },
      server: {
        create: {
          ...data.server,
        },
        update: {
          id: data.server.id,
        },
      },
    });
    expect(channel).toEqual(data.channels[0]);
  });
});

describe("Channel Update", () => {
  it("should succeed updating a channel with manage guild", async () => {
    await manage_guild_router.create(data.server);
    await manage_channel_router.create(data.channels[0]);
    const channel = await manage_channel_router.update({
      id: data.channels[0].id,
      name: "new name",
    });
    expect(channel).toEqual({ ...data.channels[0], name: "new name" });
  });
  it("should fail updating a channel with default permissions", async () => {
    await manage_guild_router.create(data.server);
    await manage_channel_router.create(data.channels[0]);
    await expect(
      default_channel_router.update({ id: data.channels[0].id, name: "new name" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("Channel Upsert", () => {
  it("should succeed upserting a new channel with manage guild", async () => {
    await manage_guild_router.create(data.server);
    const channel = await manage_channel_router.upsert({
      create: data.channels[0],
      update: { id: data.channels[0].id, name: "new name" },
    });
    expect(channel).toEqual(data.channels[0]);
  });
  it("should fail upserting a new channel with default permissions", async () => {
    await manage_guild_router.create(data.server);
    await expect(
      default_channel_router.upsert({
        create: data.channels[0],
        update: { id: data.channels[0].id, name: "new name" },
      })
    ).rejects.toThrow(TRPCError);
  });
  it("should upsert a channel with dependencies", async () => {
    const channel = await manage_channel_router.upsertWithDeps({
      create: {
        channel: {
          ...data.channels[0],
        },
        server: {
          create: {
            ...data.server,
          },
          update: {
            id: data.server.id,
          },
        },
      },
      update: {
        id: data.channels[0].id,
        name: "new name",
      },
    });
    expect(channel).toEqual(data.channels[0]);
  });
  it("should succeed upserting many channels", async () => {
    await manage_guild_router.create(data.server);
    const channels = await manage_channel_router.upsertMany(
      data.channels.map((channel) => ({
        create: channel,
        update: { id: channel.id, name: "new name" },
      }))
    );
    expect(channels).toEqual(data.channels);
  });
});
