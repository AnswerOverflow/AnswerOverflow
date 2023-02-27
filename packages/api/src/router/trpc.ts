import { initTRPC } from "@trpc/server";
import type { Context } from "./context";
import superjson from "superjson";
import { getDiscordOauthThrowIfNotFound } from "../utils/discord-operations";
import { getDiscordUser, getUserServers } from "@answeroverflow/cache";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

async function getDiscordOauth(ctx: Context) {
  if (!ctx.session) {
    return null;
  }
  const discordOauth = await getDiscordOauthThrowIfNotFound(ctx.session.user.id);
  return discordOauth;
}

const addDiscordAccount = t.middleware(async ({ ctx, next }) => {
  if (ctx.caller === "web-client" && ctx.session) {
    const discordOauth = await getDiscordOauth(ctx);
    if (discordOauth && discordOauth.access_token) {
      const discordAccount = await getDiscordUser(discordOauth.access_token);
      ctx.discordAccount = discordAccount;
    }
  }
  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

export const getUserServersFromCtx = async (ctx: Context) => {
  const discordOauth = await getDiscordOauth(ctx);
  if (discordOauth && discordOauth.access_token) {
    const userServers = await getUserServers(discordOauth.access_token);
    ctx.userServers = userServers;
    return userServers;
  }

  return [];
};

const addUserServers = t.middleware(async ({ ctx, next }) => {
  // In a test environment, we manually populate it
  if (ctx.caller === "web-client" && process.env.NODE_ENV !== "test") {
    ctx.userServers = await getUserServersFromCtx(ctx);
  }
  if (!ctx.userServers) {
    ctx.userServers = []; // TODO: Maybe throw error here instead?
  }
  return next({
    ctx: {
      userServers: ctx.userServers,
    },
  });
});

export const router = t.router;
export const MergeRouters = t.mergeRouters;
export const publicProcedure = t.procedure;
export const withDiscordAccountProcedure = t.procedure.use(addDiscordAccount);
export const withUserServersProcedure = t.procedure.use(addUserServers);
