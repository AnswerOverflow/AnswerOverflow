import { User } from "@prisma/client";
import { AnswerOverflowClient } from "../answer-overflow-client";

export const TEST_USER_1: User = {
  avatar: "test",
  created_at: 0,
  email: "test",
  id: "1",
  name: "test",
};

export async function clearDatabase(answer_overflow_client: AnswerOverflowClient) {
  await answer_overflow_client.prisma.userServerSettings.deleteMany({});
  await answer_overflow_client.prisma.userChannelSettings.deleteMany({});
  await answer_overflow_client.prisma.serverSettings.deleteMany({});
  await answer_overflow_client.prisma.channelSettings.deleteMany({});
  await answer_overflow_client.prisma.channel.deleteMany({});
  await answer_overflow_client.prisma.server.deleteMany({});
  await answer_overflow_client.prisma.user.deleteMany({});
}
