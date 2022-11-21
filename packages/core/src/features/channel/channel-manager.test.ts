import { AnswerOverflowClient } from "../../answer-overflow-client";
import { clearDatabase } from "../../utils/test-constants";
import { Server_CreateInput } from "../server/server-manager";
import { Channel_CreateInput } from "./channel-manager";
let answer_overflow_client: AnswerOverflowClient;
beforeEach(async () => {
  answer_overflow_client = new AnswerOverflowClient();
  await clearDatabase(answer_overflow_client);
});

const TEST_SERVER_1: Server_CreateInput = {
  id: "1",
  name: "test",
  icon: "test",
};

const TEST_CHANNEL_1: Channel_CreateInput = {
  id: "1",
  name: "test",
  type: 1,
  server_id: "1",
};

const TEST_CHANNEL_2: Channel_CreateInput = {
  id: "2",
  name: "test",
  type: 1,
  server_id: "1",
};

describe("Channel Manager", () => {
  it("should find first channel", async () => {
    const channel = await answer_overflow_client.channels.findFirst({
      where: {
        id: "1",
      },
    });
    expect(channel).toBeNull();
  });
  it("should create a channel", async () => {
    await answer_overflow_client.servers.create({
      data: TEST_SERVER_1,
    });
    const channel = await answer_overflow_client.channels.create({
      data: TEST_CHANNEL_1,
    });

    expect(channel).toBeDefined();
    expect(channel.id).toBe("1");
    expect(channel.name).toBe("test");
  });
  it("should create multiple channels", async () => {
    await answer_overflow_client.servers.create({
      data: TEST_SERVER_1,
    });
    const channels = await answer_overflow_client.channels.createMany({
      data: [TEST_CHANNEL_1, TEST_CHANNEL_2],
    });
    expect(channels).toBeDefined();
    expect(channels.count).toBe(2);
  });
  it("should find a channel", async () => {
    await answer_overflow_client.servers.create({
      data: TEST_SERVER_1,
    });
    await answer_overflow_client.channels.create({
      data: TEST_CHANNEL_1,
    });
    const channel = await answer_overflow_client.channels.findUnique({
      where: {
        id: "1",
      },
    });
    expect(channel).toBeDefined();
    expect(channel?.id).toBe("1");
  });
  it("should find a channel with server", async () => {
    await answer_overflow_client.servers.create({
      data: TEST_SERVER_1,
    });
    await answer_overflow_client.channels.create({
      data: TEST_CHANNEL_1,
    });
    const channel = await answer_overflow_client.channels.findUnique({
      where: {
        id: "1",
      },
    });
    expect(channel).toBeDefined();
    expect(channel?.id).toBe("1");
  });
  it("should find a channel by id", async () => {
    await answer_overflow_client.servers.create({
      data: TEST_SERVER_1,
    });
    await answer_overflow_client.channels.create({
      data: TEST_CHANNEL_1,
    });
    const channel = await answer_overflow_client.channels.findFirst({
      where: {
        id: "1",
      },
    });
    expect(channel).toBeDefined();
    expect(channel?.id).toBe("1");
  });
});
