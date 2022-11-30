import { prisma } from "@answeroverflow/db";
import { z } from "zod";
import { channel_create_input } from "../src/router/channel";
import { server_create_input } from "../src/router/server";
export async function clearDatabase() {
  await prisma.userServerSettings.deleteMany({});
  await prisma.userChannelSettings.deleteMany({});
  await prisma.serverSettings.deleteMany({});
  await prisma.channelSettings.deleteMany({});
  await prisma.channel.deleteMany({});
  await prisma.server.deleteMany({});
  await prisma.user.deleteMany({});
}

export const TEST_SERVER_1: z.infer<typeof server_create_input> = {
  id: "test",
  name: "test",
};

export const TEST_CHANNEL_1: z.infer<typeof channel_create_input> = {
  id: "test",
  name: "test",
  type: 0,
};
