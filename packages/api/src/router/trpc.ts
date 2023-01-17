import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import superjson from "superjson";
import { getDiscordAccount } from "../utils/discord-operations";
import { getDiscordUser, getUserServers } from "@answeroverflow/auth/src/discord-oauth";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

async function getDiscordOauth(ctx: Context) {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }
  const discord_oauth = await getDiscordAccount(ctx.prisma, ctx.session.user.id);
  return discord_oauth;
}

const addDiscordAccount = t.middleware(async ({ ctx, next }) => {
  if (ctx.caller === "web-client") {
    const discord_oauth = await getDiscordOauth(ctx);
    if (!discord_oauth.access_token) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }
    const discord_account = await getDiscordUser(discord_oauth.access_token);
    ctx.discord_account = discord_account;
  }
  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

const addUserServers = t.middleware(async ({ ctx, next }) => {
  if (ctx.caller === "web-client") {
    if (ctx.session) {
      const discord_oauth = await getDiscordOauth(ctx);
      if (!discord_oauth.access_token) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }
      const user_servers = await getUserServers(discord_oauth.access_token);
      ctx.user_servers = user_servers;
    }
  }
  if (!ctx.user_servers) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No server permissions found",
    });
  }
  return next({
    ctx: {
      user_servers: ctx.user_servers,
    },
  });
});

export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const publicProcedure = t.procedure;
export const withDiscordAccountProcedure = t.procedure.use(addDiscordAccount);
export const withUserServersProcedure = t.procedure.use(addUserServers);
