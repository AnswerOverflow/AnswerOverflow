import { prisma } from "@answeroverflow/prisma-types";
import { findDiscordAccountById } from "./discord-account";
import { DBError } from "./utils/error";

export function findIgnoredDiscordAccountById(id: string) {
  return prisma.ignoredDiscordAccount.findUnique({
    where: { id },
  });
}

export function findManyIgnoredDiscordAccountsById(ids: string[]) {
  return prisma.ignoredDiscordAccount.findMany({
    where: { id: { in: ids } },
  });
}

export async function upsertIgnoredDiscordAccount(id: string) {
  const discordAccount = await findDiscordAccountById(id);
  if (discordAccount) throw new DBError("Account is not ignored", "NOT_IGNORED_ACCOUNT");
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

export async function deleteIgnoredDiscordAccount(id: string) {
  return prisma.ignoredDiscordAccount.delete({
    where: { id },
  });
}
