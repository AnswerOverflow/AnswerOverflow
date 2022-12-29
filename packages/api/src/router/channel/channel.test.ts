import { Channel, clearDatabase, Thread } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";
import { type ServerTestData, getGeneralScenario } from "~api/test/utils";
import {
  channelRouter,
  makeChannelCreateWithDepsInput,
  makeChannelUpsert,
  makeChannelUpsertWithDeps,
  makeThreadUpsertWithDeps,
} from "./channel";
import { serverRouter } from "../server/server";

let manage_guild_router: ReturnType<typeof serverRouter["createCaller"]>;
let manage_channel_router: ReturnType<typeof channelRouter["createCaller"]>;
let default_channel_router: ReturnType<typeof channelRouter["createCaller"]>;
let test_data_1: ServerTestData;
let channel_1: Channel;
let thread_1: Thread;
beforeEach(async () => {
  const { data1 } = await getGeneralScenario();
  test_data_1 = data1;
  default_channel_router = channelRouter.createCaller(test_data_1.default_ctx);
  manage_channel_router = channelRouter.createCaller(test_data_1.manage_guild_ctx);
  manage_guild_router = serverRouter.createCaller(test_data_1.manage_guild_ctx);
  channel_1 = test_data_1.text_channels[0].channel;
  thread_1 = test_data_1.text_channels[0].threads[0].thread;
  await clearDatabase();
});

describe("Channel Create", () => {
  it("should succeed creating a channel with manage guild", async () => {
    await manage_guild_router.create(test_data_1.server);
    const channel = await manage_channel_router.create(channel_1);
    expect(channel).toEqual(channel_1);
  });
  it("should fail creating a channel with default permissions", async () => {
    await manage_guild_router.create(test_data_1.server);
    await expect(default_channel_router.create(channel_1)).rejects.toThrow(TRPCError);
  });
  it("should create a channel with dependencies", async () => {
    const channel = await manage_channel_router.createWithDeps(
      makeChannelCreateWithDepsInput(channel_1, test_data_1.server)
    );
    expect(channel).toEqual(channel_1);
  });
});

describe("Channel Update", () => {
  it("should succeed updating a channel with manage guild", async () => {
    await manage_guild_router.create(test_data_1.server);
    await manage_channel_router.create(channel_1);
    const channel = await manage_channel_router.update({
      id: channel_1.id,
      data: {
        name: "new name",
      },
    });
    expect(channel).toEqual({ ...channel_1, name: "new name" });
  });
  it("should fail updating a channel with default permissions", async () => {
    await manage_guild_router.create(test_data_1.server);
    await manage_channel_router.create(channel_1);
    await expect(
      default_channel_router.update({
        id: channel_1.id,
        data: {
          name: "new name",
        },
      })
    ).rejects.toThrow(TRPCError);
  });
});

describe("Channel Upsert", () => {
  it("should succeed upserting a new channel with manage guild", async () => {
    await manage_guild_router.create(test_data_1.server);
    const channel = await manage_channel_router.upsert(makeChannelUpsert(channel_1));
    expect(channel).toEqual(channel_1);
  });
  it("should fail upserting a new channel with default permissions", async () => {
    await manage_guild_router.create(test_data_1.server);
    await expect(default_channel_router.upsert(makeChannelUpsert(channel_1))).rejects.toThrow(
      TRPCError
    );
  });
  it("should upsert a channel with dependencies", async () => {
    const channel = await manage_channel_router.upsertWithDeps(
      makeChannelUpsertWithDeps(channel_1, test_data_1.server)
    );
    expect(channel).toEqual(channel_1);
  });
  it("should succeed upserting many channels", async () => {
    await manage_guild_router.create(test_data_1.server);
    const channels = await manage_channel_router.upsertMany(
      test_data_1.text_channels.map((channel) => makeChannelUpsert(channel.channel))
    );
    expect(channels).toEqual(test_data_1.text_channels.map((channel) => channel.channel));
  });
});

describe("Thread Upsert", () => {
  it("should succeed upserting a new thread with manage guild", async () => {
    await manage_guild_router.create(test_data_1.server);
    const thread = await manage_channel_router.upsertThreadWithDeps(
      makeThreadUpsertWithDeps(thread_1, test_data_1.text_channels[0].channel, test_data_1.server)
    );
    expect(thread).toEqual(test_data_1.text_channels[0].threads[0].thread);
  });
});
