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

describe("User manager tests", () => {
  it("should create a new user", async () => {
    const user = await answer_overflow_client.users.create({
      data: {
        id: "1",
      },
      test: {},
    });
    expect(user).not.toBeNull();
  });
});
