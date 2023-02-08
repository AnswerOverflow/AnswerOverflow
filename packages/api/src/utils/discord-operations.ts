import type { PrismaClient } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";

export async function getDiscordAccount(prisma: PrismaClient, userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      accounts: {
        where: {
          provider: "discord",
        },
      },
    },
  });
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }
  const discordAccount = user.accounts[0];
  if (!discordAccount || !discordAccount.access_token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }
  return discordAccount;
}
