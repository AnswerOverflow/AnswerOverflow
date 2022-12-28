import { clearDatabase } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";
import { type ServerTestData, getGeneralScenario } from "~api/test/utils";
import { channelRouter } from "./channel";
import { serverRouter } from "../server/server";

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
    const channel = await manage_channel_router.create(data.text_channels[0].channel);
    expect(channel).toEqual(data.text_channels[0].channel);
  });
  it("should fail creating a channel with default permissions", async () => {
    await manage_guild_router.create(data.server);
    await expect(default_channel_router.create(data.text_channels[0].channel)).rejects.toThrow(
      TRPCError
    );
  });
  it("should create a channel with dependencies", async () => {
    const channel = await manage_channel_router.createWithDeps({
      channel: {
        ...data.text_channels[0].channel,
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
    expect(channel).toEqual(data.text_channels[0].channel);
  });
});

describe("Channel Update", () => {
  it("should succeed updating a channel with manage guild", async () => {
    await manage_guild_router.create(data.server);
    await manage_channel_router.create(data.text_channels[0].channel);
    const channel = await manage_channel_router.update({
      id: data.text_channels[0].channel.id,
      name: "new name",
    });
    expect(channel).toEqual({ ...data.text_channels[0].channel, name: "new name" });
  });
  it("should fail updating a channel with default permissions", async () => {
    await manage_guild_router.create(data.server);
    await manage_channel_router.create(data.text_channels[0].channel);
    await expect(
      default_channel_router.update({ id: data.text_channels[0].channel.id, name: "new name" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("Channel Upsert", () => {
  it("should succeed upserting a new channel with manage guild", async () => {
    await manage_guild_router.create(data.server);
    const channel = await manage_channel_router.upsert({
      create: data.text_channels[0].channel,
      update: { id: data.text_channels[0].channel.id, name: "new name" },
    });
    expect(channel).toEqual(data.text_channels[0].channel);
  });
  it("should fail upserting a new channel with default permissions", async () => {
    await manage_guild_router.create(data.server);
    await expect(
      default_channel_router.upsert({
        create: data.text_channels[0].channel,
        update: { id: data.text_channels[0].channel.id, name: "new name" },
      })
    ).rejects.toThrow(TRPCError);
  });
  it("should upsert a channel with dependencies", async () => {
    const channel = await manage_channel_router.upsertWithDeps({
      create: {
        channel: {
          ...data.text_channels[0].channel,
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
        id: data.text_channels[0].channel.id,
        name: "new name",
      },
    });
    expect(channel).toEqual(data.text_channels[0].channel);
  });
  it("should succeed upserting many channels", async () => {
    await manage_guild_router.create(data.server);
    const channels = await manage_channel_router.upsertMany(
      data.text_channels.map((channel) => ({
        create: channel.channel,
        update: { id: channel.channel.id, name: "new name" },
      }))
    );
    expect(channels).toEqual(data.text_channels.map((channel) => channel.channel));
  });
});

describe("Thread Upsert", () => {
  it("should succeed upserting a new thread with manage guild", async () => {
    await manage_guild_router.create(data.server);
    const thread = await manage_channel_router.upsertThreadWithDeps({
      create: {
        thread: data.text_channels[0].threads[0],
        parent: {
          create: {
            channel: {
              ...data.text_channels[0].channel,
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
            id: data.text_channels[0].channel.id,
          },
        },
      },
      update: {
        id: data.text_channels[0].threads[0].id,
        name: "new name",
      },
    });
    expect(thread).toEqual(data.text_channels[0].threads[0]);
  });
});
