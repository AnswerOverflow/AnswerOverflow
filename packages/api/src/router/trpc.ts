import { initTRPC } from "@trpc/server";
import type { Context } from "./context";
import superjson from "superjson";
import { getDiscordAccount } from "../utils/discord-operations";
import { getDiscordUser, getUserServers } from "@answeroverflow/auth";

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
  const discord_oauth = await getDiscordAccount(ctx.prisma, ctx.session.user.id);
  return discord_oauth;
}

const add_discord_accont = t.middleware(async ({ ctx, next }) => {
  if (ctx.caller === "web-client" && ctx.session) {
    const discord_oauth = await getDiscordOauth(ctx);
    if (discord_oauth && discord_oauth.access_token) {
      const discord_account = await getDiscordUser(discord_oauth.access_token);
      ctx.discord_account = discord_account;
    }
  }
  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

export const GetUserServersFromCtx = async (ctx: Context) => {
  const discord_oauth = await getDiscordOauth(ctx);
  if (discord_oauth && discord_oauth.access_token) {
    const user_servers = await getUserServers(discord_oauth.access_token);
    ctx.user_servers = user_servers;
    return user_servers;
  }

  return [];
};

const add_user_servers = t.middleware(async ({ ctx, next }) => {
  // In a test environment, we manually populate it
  if (ctx.caller === "web-client" && process.env.NODE_ENV !== "test") {
    ctx.user_servers = await GetUserServersFromCtx(ctx);
  }
  if (!ctx.user_servers) {
    ctx.user_servers = []; // TODO: Maybe throw error here instead?
  }
  return next({
    ctx: {
      user_servers: ctx.user_servers,
    },
  });
});

export const router = t.router;
export const MergeRouters = t.mergeRouters;
export const public_procedure = t.procedure;
export const with_discord_account_procedure = t.procedure.use(add_discord_accont);
export const with_user_servers_procedure = t.procedure.use(add_user_servers);
