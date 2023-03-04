import { prisma } from "@answeroverflow/prisma-types";
import { elastic } from "@answeroverflow/elastic-types";
import { getRedisClient } from "@answeroverflow/cache";
export async function clearDatabase() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("clearDatabase can only be used in test environment");
  }
  console.log("Wiping database...");

  const client = await getRedisClient();
  await prisma.userServerSettings.deleteMany({});
  await prisma.channel.deleteMany({
    where: {
      parentId: {
        not: null,
      },
    },
  });
  await prisma.channel.deleteMany({});
  await prisma.server.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.discordAccount.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.ignoredDiscordAccount.deleteMany({});
  await elastic.createMessagesIndex();
  await client.flushAll();
  await client.disconnect();
  console.log("Database wiped successfully");
}
