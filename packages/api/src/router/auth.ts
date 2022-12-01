import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../trpc";

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
    // TODO: This needs to be cached as it's going to be called a lot and we need to avoid rate limits
    const servers = await fetch("https://discordapp.com/api/users/@me/guilds", {
      headers: {
        Authorization: "Bearer " + discord_account.access_token,
        "Content-Type": "application/json",
      },
    });
    const data = serversSchema.parse(await servers.json());
    return data;
  }),
});

const serverSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  owner: z.boolean(),
  permissions: z.number(),
  features: z.array(z.string()),
});

const serversSchema = z.array(serverSchema);
