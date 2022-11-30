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
  it("should create new channel settings", async () => {
    const channelSettings = await router.channel_settings.upsert({
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
    expect(channelSettings).toMatchObject(TEST_CHANNEL_1);
  });
  it("should create a channel settings and then update it", async () => {
    const channelSettings = await router.channel_settings.upsert({
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
    expect(channelSettings).toMatchObject(TEST_CHANNEL_1);
    const updatedChannelSettings = await router.channel_settings.upsert({
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
    expect(updatedChannelSettings).toMatchObject({
      ...TEST_CHANNEL_1,
      name: "updated",
    });
  });
  it("should create a channel and then channel settings", async () => {
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
    const channelSettings = await router.channel_settings.upsert({
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
    expect(channelSettings).toMatchObject(TEST_CHANNEL_1);
  });
});
