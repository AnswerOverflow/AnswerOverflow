import type { PrismaClient } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";

export async function getDiscordAccount(prisma: PrismaClient, user_id: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: user_id,
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
  const discord_account = user.accounts[0];
  if (!discord_account || !discord_account.access_token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }
  return discord_account;
}
