import { prisma, elastic } from "..";

export async function clearDatabase() {
  await prisma.userServerSettings.deleteMany({});
  await prisma.serverSettings.deleteMany({});
  await prisma.channelSettings.deleteMany({});
  await prisma.channel.deleteMany({});
  await prisma.server.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.discordAccount.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.ignoredDiscordAccount.deleteMany({});
  await elastic.createMessagesIndex();
}
