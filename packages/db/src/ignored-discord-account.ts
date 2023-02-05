import { findDiscordAccountById, PrismaClient } from "..";

export function findIgnoredDiscordAccountById(id: string, prisma: PrismaClient) {
  return prisma.ignoredDiscordAccount.findUnique({
    where: { id },
  });
}

export function findManyIgnoredDiscordAccountsById(ids: string[], prisma: PrismaClient) {
  return prisma.ignoredDiscordAccount.findMany({
    where: { id: { in: ids } },
  });
}

export async function upsertIgnoredDiscordAccount(id: string, prisma: PrismaClient) {
  const discord_account = await findDiscordAccountById(id, prisma);
  if (discord_account)
    throw new Error(
      "Cannot create an ignored account entry for an existing user, delete the account first"
    );
  return prisma.ignoredDiscordAccount.upsert({
    where: { id },
    create: {
      id,
    },
    update: {
      id,
    },
  });
}

export async function deleteIgnoredDiscordAccount(id: string, prisma: PrismaClient) {
  return prisma.ignoredDiscordAccount.delete({
    where: { id },
  });
}
