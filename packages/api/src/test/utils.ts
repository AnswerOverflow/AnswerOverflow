import { prisma, Server } from "@answeroverflow/db";
import type { ChannelUpsertInput } from "@utils/types";

export async function clearDatabase() {
  await prisma.userServerSettings.deleteMany({});
  await prisma.userChannelSettings.deleteMany({});
  await prisma.serverSettings.deleteMany({});
  await prisma.channelSettings.deleteMany({});
  await prisma.channel.deleteMany({});
  await prisma.server.deleteMany({});
  await prisma.user.deleteMany({});
}

export const TEST_SERVER_1: Server = {
  id: "test",
  name: "test",
  icon: null,
  kicked_time: null,
};

export const TEST_CHANNEL_1: ChannelUpsertInput["create"] = {
  id: "test",
  name: "test",
  type: 0,
  server: {
    create: { id: TEST_SERVER_1.id, name: TEST_SERVER_1.name },
    update: { name: TEST_SERVER_1.name },
  },
};
