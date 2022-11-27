import { AnswerOverflowClient } from "../answer-overflow-client";
import { Server_CreateInput } from "../features/server/server-manager";
import { User_Create } from "../features/user/user-manager";

export const TEST_SERVER_1: Server_CreateInput = {
  id: "1",
  name: "Test Server 1",
};

export const TEST_USER_1: User_Create = {
  avatar: "test",
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
