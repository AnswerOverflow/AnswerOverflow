import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

import { prisma } from "@answeroverflow/db";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getDiscordUser } from "./discord-oauth";
import type { AdapterAccount } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
  // Configure one or more authentication providers
  adapter: {
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
  },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
      authorization: "https://discord.com/api/oauth2/authorize?scope=identify+email+guilds",
    }),
    // ...add more providers here
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};
