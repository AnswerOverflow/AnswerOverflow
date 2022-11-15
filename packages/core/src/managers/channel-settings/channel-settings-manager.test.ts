import { Channel, Server } from "@prisma/client";
import { AnswerOverflowClient } from "../../answer-overflow-client";

let answer_overflow_client: AnswerOverflowClient;
beforeEach(async () => {
  answer_overflow_client = new AnswerOverflowClient();
  await answer_overflow_client.prisma.userServerSettings.deleteMany({});
  await answer_overflow_client.prisma.userChannelSettings.deleteMany({});
  await answer_overflow_client.prisma.serverSettings.deleteMany({});
  await answer_overflow_client.prisma.channelSettings.deleteMany({});
  await answer_overflow_client.prisma.channel.deleteMany({});
  await answer_overflow_client.prisma.server.deleteMany({});
  await answer_overflow_client.prisma.user.deleteMany({});
});

const TEST_SERVER_1: Server = {
  name: "Test Server",
  id: "10",
  icon: null,
  kicked_time: null,
};

const TEST_CHANNEL_1: Channel = {
  id: "7",
  name: "Test Channel",
  type: 0,
  server_id: "10",
};

describe("ChannelSettingsManager", () => {
  it("should create a new channel settings object", async () => {
    await answer_overflow_client.channel_settings.create(TEST_CHANNEL_1, TEST_SERVER_1);

    const new_settings = await answer_overflow_client.channel_settings.get(TEST_CHANNEL_1.id);

    expect(new_settings).not.toBeNull();

    await new_settings!.enableIndexing("test");
    expect(new_settings!.indexing_enabled).toBe(true);

    const updated_settings = await answer_overflow_client.channel_settings.get(TEST_CHANNEL_1.id);
    expect(updated_settings!.indexing_enabled).toBe(true);

    await updated_settings?.disableIndexing();
    expect(updated_settings!.indexing_enabled).toBe(false);
    expect(new_settings!.indexing_enabled).toBe(false);
  });
});
