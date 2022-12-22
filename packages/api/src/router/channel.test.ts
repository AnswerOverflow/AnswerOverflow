import { clearDatabase } from "@answeroverflow/db";
import { createContextInner } from "../context";
import { getServerTestData } from "../test/utils";
import { channelRouter } from "./channel";
import { serverRouter } from "./server";

let channels: ReturnType<typeof channelRouter["createCaller"]>;
let servers: ReturnType<typeof serverRouter["createCaller"]>;
let test_data: ReturnType<typeof getServerTestData>;
beforeEach(async () => {
  const a = await createContextInner({
    session: null,
    caller: "discord-bot",
    user_servers: null,
  });
  channels = channelRouter.createCaller(a);
  servers = serverRouter.createCaller(a);
  test_data = getServerTestData();
  await clearDatabase();
});

describe("Channel Create", () => {
  it("should create a new channel", async () => {
    await servers.create(test_data.server);
    const channel = await channels.create(test_data.channels[0]);
    expect(channel).toEqual(test_data.channels[0]);
    const fetched_channel = await channels.byId(test_data.channels[0].id);
    expect(fetched_channel).toEqual(test_data.channels[0]);
  });
  it("should create a new channel with dependencies", async () => {
    const channel = await channels.createWithDeps({
      channel: test_data.channels[0],
      server: {
        create: test_data.server,
        update: test_data.server,
      },
    });
    expect(channel).toEqual(test_data.channels[0]);
    const fetched_channel = await channels.byId(test_data.channels[0].id);
    expect(fetched_channel).toEqual(test_data.channels[0]);
  });
  test.todo("should create a channel that already exists and fail");
  test.todo("should create a channel with a server that does not exist and fail");
});

describe("Channel Create Bulk", () => {
  it("should bulk create a list of channels", async () => {
    await servers.create(test_data.server);
    await channels.createBulk(test_data.channels);
    const fetched_channels = await channels.byIdBulk(test_data.channels.map((c) => c.id));
    expect(fetched_channels).toHaveLength(2);
  });
  it("should bulk create with dependencies", async () => {
    await channels.createBulkWithDeps(
      test_data.channels.map((channel) => ({
        channel,
        server: {
          create: test_data.server,
          update: test_data.server,
        },
      }))
    );
    const fetched_channels = await channels.byIdBulk(test_data.channels.map((c) => c.id));
    expect(fetched_channels).toHaveLength(2);
  });
  test.todo("should bulk create with dependencies from different servers");
  test.todo("should bulk create a list of channels, one of which does not have a server");
  test.todo("should bulk create a list of channels, one of which already exists");
});

describe("Channel Update", () => {
  it("should update an existing channel", async () => {
    await servers.create(test_data.server);
    await channels.create(test_data.channels[0]);
    const updated_channel = { ...test_data.channels[0], name: "new-name" };
    const channel = await channels.update({
      id: test_data.channels[0].id,
      update: updated_channel,
    });
    expect(channel).toEqual(updated_channel);
    const fetched_channel = await channels.byId(test_data.channels[0].id);
    expect(fetched_channel).toEqual(updated_channel);
  });
  test.todo("should update a channel that does not exist and fail");
});

describe("Channel Update Bulk", () => {
  it("should bulk update a list of channels", async () => {
    await servers.create(test_data.server);
    await channels.createBulk(test_data.channels);
    await channels.updateBulk([
      {
        id: test_data.channels[0].id,
        update: {
          name: "new-name",
        },
      },
      {
        id: test_data.channels[1].id,
        update: {
          name: "new-name2",
        },
      },
    ]);
    const fetched_channels = await channels.byIdBulk(test_data.channels.map((c) => c.id));
    expect(fetched_channels).toHaveLength(2);
    expect(fetched_channels[0].name).toEqual("new-name");
    expect(fetched_channels[1].name).toEqual("new-name2");
  });
  test.todo("should bulk update a list of channels, one of which does not exist");
});

describe("Channel Upsert", () => {
  it("should upsert a channel that does not exist", async () => {
    await servers.create(test_data.server);
    const channel = await channels.upsert({
      create: test_data.channels[0],
      update: test_data.channels[0],
    });
    expect(channel).toEqual(test_data.channels[0]);
    const fetched_channel = await channels.byId(test_data.channels[0].id);
    expect(fetched_channel).toEqual(test_data.channels[0]);
  });
  it("should upsert a channel that does exist", async () => {
    await servers.create(test_data.server);
    await channels.create(test_data.channels[0]);
    const channel = await channels.upsert({
      create: test_data.channels[0],
      update: test_data.channels[0],
    });
    expect(channel).toEqual(test_data.channels[0]);
    const fetched_channel = await channels.byId(test_data.channels[0].id);
    expect(fetched_channel).toEqual(test_data.channels[0]);
  });
  it("should upsert a channel with dependencies", async () => {
    const channel = await channels.upsertWithDeps({
      channel: test_data.channels[0],
      server: {
        create: test_data.server,
        update: test_data.server,
      },
    });
    expect(channel).toEqual(test_data.channels[0]);
    const fetched_channel = await channels.byId(test_data.channels[0].id);
    expect(fetched_channel).toEqual(test_data.channels[0]);
  });
});

describe("Channel Upsert Bulk", () => {
  it("should bulk upsert a list of channels", async () => {
    await servers.create(test_data.server);
    await channels.createBulk(test_data.channels);
    await channels.upsertBulk([
      {
        create: test_data.channels[0],
        update: {
          name: "new-name",
        },
      },
      {
        create: test_data.channels[1],
        update: {
          name: "new-name2",
        },
      },
    ]);
    const fetched_channels = await channels.byIdBulk(test_data.channels.map((c) => c.id));
    expect(fetched_channels).toHaveLength(2);
    expect(fetched_channels[0].name).toEqual("new-name");
    expect(fetched_channels[1].name).toEqual("new-name2");
  });
  it("should bulk upsert a list of channels with dependencies", async () => {
    await channels.upsertBulkWithDeps([
      {
        channel: test_data.channels[0],
        server: {
          create: test_data.server,
          update: test_data.server,
        },
      },
      {
        channel: test_data.channels[1],
        server: {
          create: test_data.server,
          update: test_data.server,
        },
      },
    ]);
    const fetched_channels = await channels.byIdBulk(test_data.channels.map((c) => c.id));
    expect(fetched_channels).toHaveLength(2);
    expect(fetched_channels[0]).toEqual(test_data.channels[0]);
    expect(fetched_channels[1]).toEqual(test_data.channels[1]);
  });
  test.todo(
    "should bulk upsert a list of channels, one of which does not exist, and one of which does exist"
  );
});
