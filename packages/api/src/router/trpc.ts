import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import superjson from "superjson";
import { getDiscordAccount } from "../utils/discord-operations";
import { getUserServers } from "@answeroverflow/auth/src/discord-oauth";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

const hasUserServers = t.middleware(async ({ ctx, next }) => {
  // The bot passes in only the server that it is editing.
  // On the server we need to fetch what guilds the user is allowed to edit
  // TODO: Could possibly be improved, but is fine for now
  if (ctx.caller === "web-client" && ctx.session) {
    const discord_account = await getDiscordAccount(ctx.prisma, ctx.session.user.id);
    if (!discord_account.access_token) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }
    const user_servers = await getUserServers(discord_account.access_token);
    ctx.user_servers = user_servers;
  }
  if (!ctx.user_servers && ctx.session && ctx.session.user.id !== "AnswerOverflow") {
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
export const protectedProcedure = t.procedure.use(isAuthed);
export const protectedProcedureWithUserServers = protectedProcedure.use(hasUserServers);
