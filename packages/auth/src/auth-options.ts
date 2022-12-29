import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

import { prisma } from "@answeroverflow/db";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { AdapterAccount } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
  // Configure one or more authentication providers
  adapter: {
    ...PrismaAdapter(prisma),
    linkAccount(account) {
      return prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
        create: {
          ...account,
        },
        update: {
          ...account,
        },
      }) as unknown as AdapterAccount;
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
