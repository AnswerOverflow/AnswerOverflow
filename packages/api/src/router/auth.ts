import { TRPCError } from "@trpc/server";

import { protectedProcedure, publicProcedure, router } from "../trpc";
import { getUserServers } from "../utils/discord-oauth";

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  getSecretMessage: protectedProcedure.query(() => {
    // testing type validation of overridden next-auth Session in @answeroverflow/auth package
    return "you can see this secret message!";
  }),
  getServers: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: {
        id: ctx.session.user.id,
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
    return await getUserServers(discord_account.access_token);
  }),
});
