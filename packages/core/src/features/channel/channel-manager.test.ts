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
  it("should create a new channel", async () => {
    const server = await answer_overflow_client.servers.findCreate(TEST_SERVER_1);
    const channel = await answer_overflow_client.channels.findCreate({
      create: {
        data: TEST_CHANNEL_1,
        server: TEST_SERVER_1,
      }
    });
    expect(channel).toBeTruthy();
    expect(channel.server_id).toBe(server.id);
  }
});
