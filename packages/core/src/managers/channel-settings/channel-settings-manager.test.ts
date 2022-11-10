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
  id: "2",
  icon: null,
  kicked_time: null,
};

const TEST_CHANNEL_1: Channel = {
  id: "3",
  name: "Test Channel",
  type: 0,
  server_id: "2",
};

describe("Channel Settings - Single Settings", () => {
  it("Creates a new channel with indexing enabled", async () => {
    const channel_settings = await answer_overflow_client.channel_settings.get({
      where: {
        channel_id: TEST_CHANNEL_1.id,
      },
      select: {
        channel_id: true,
      },
    });
    expect(channel_settings).toBeNull();
    const updated_settings = await answer_overflow_client.channel_settings.enableIndexing(
      TEST_CHANNEL_1,
      TEST_SERVER_1,
      "xdfasdwG"
    );
    expect(updated_settings).not.toBeNull();
    expect(updated_settings.bitfield.checkFlag("INDEXING_ENABLED")).toBe(true);
    const disabled_indexing = await answer_overflow_client.channel_settings.disableIndexing(
      TEST_CHANNEL_1,
      TEST_SERVER_1
    );
    expect(disabled_indexing.bitfield.checkFlag("INDEXING_ENABLED")).toBe(false);
  });
});
