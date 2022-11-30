import { botRouter } from ".";
import { clearDatabase, TEST_CHANNEL_1, TEST_SERVER_1 } from "../../test/utils";
import { createContextInner } from "../context";

// eslint-disable-next-line no-unused-vars
let router: ReturnType<typeof botRouter["createCaller"]>;

beforeEach(async () => {
  const a = await createContextInner({
    session: null,
  });
  router = botRouter.createCaller(a);
  await clearDatabase();
});

describe("channelRouter", () => {
  it("should create a new channel", async () => {
    const channel = await router.channels.upsert({
      channel: {
        create: TEST_CHANNEL_1,
        update: {
          ...TEST_CHANNEL_1,
        },
      },
      server: {
        create: TEST_SERVER_1,
        update: {
          ...TEST_SERVER_1,
        },
      },
    });
    expect(channel).toMatchObject(TEST_CHANNEL_1);
  });
  it("should create a channel and then update it", async () => {
    const channel = await router.channels.upsert({
      channel: {
        create: TEST_CHANNEL_1,
        update: {
          ...TEST_CHANNEL_1,
        },
      },
      server: {
        create: TEST_SERVER_1,
        update: {
          ...TEST_SERVER_1,
        },
      },
    });
    expect(channel).toMatchObject(TEST_CHANNEL_1);
    const updatedChannel = await router.channels.upsert({
      channel: {
        create: TEST_CHANNEL_1,
        update: {
          ...TEST_CHANNEL_1,
          name: "updated",
        },
      },
      server: {
        create: TEST_SERVER_1,
        update: {
          ...TEST_SERVER_1,
        },
      },
    });
    expect(updatedChannel).toMatchObject({
      ...TEST_CHANNEL_1,
      name: "updated",
    });
  });
  it("should find a channel by its id", async () => {
    const channel = await router.channels.upsert({
      channel: {
        create: TEST_CHANNEL_1,
        update: {
          ...TEST_CHANNEL_1,
        },
      },
      server: {
        create: TEST_SERVER_1,
        update: {
          ...TEST_SERVER_1,
        },
      },
    });
    expect(channel).toMatchObject(TEST_CHANNEL_1);
    const foundChannel = await router.channels.byId(TEST_CHANNEL_1.id);
    expect(foundChannel).toMatchObject(TEST_CHANNEL_1);
  });
  it("should upsert a server and then a channel", async () => {
    const server = await router.servers.upsert({
      create: TEST_SERVER_1,
      update: {
        ...TEST_SERVER_1,
      },
    });
    expect(server).toMatchObject(TEST_SERVER_1);
    const channel = await router.channels.upsert({
      channel: {
        create: TEST_CHANNEL_1,
        update: {
          ...TEST_CHANNEL_1,
        },
      },
      server: {
        create: TEST_SERVER_1,
        update: {
          ...TEST_SERVER_1,
        },
      },
    });
    expect(channel).toMatchObject(TEST_CHANNEL_1);
  });
});
