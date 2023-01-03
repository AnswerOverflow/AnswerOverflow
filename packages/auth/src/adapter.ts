import { prisma } from "@answeroverflow/db";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getDiscordUser } from "./discord-oauth";
import type { Adapter, AdapterAccount } from "next-auth/adapters";

export const extendedAdapter: Adapter = {
  ...PrismaAdapter(prisma),
  async linkAccount(account) {
    if (account.provider !== "discord") {
      throw Error("Unknown account provider");
    }
    if (!account.access_token) {
      throw Error("No access token");
    }
    const user = await getDiscordUser(account.access_token);
    await prisma.discordAccount.upsert({
      where: {
        id: user.id,
      },
      update: {
        name: user.username,
        avatar: user.avatar,
      },
      create: {
        id: user.id,
        name: user.username,
        avatar: user.avatar,
      },
    });
    return PrismaAdapter(prisma).linkAccount(account) as unknown as AdapterAccount;
  },
};
