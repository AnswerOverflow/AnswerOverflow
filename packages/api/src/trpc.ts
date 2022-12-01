import { initTRPC, TRPCError } from "@trpc/server";
import { type Context } from "./context";
import superjson from "superjson";

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

const hasUserServers = t.middleware(({ ctx, next }) => {
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
export const protectedProcedure = t.procedure.use(isAuthed);
export const protectedProcedureWithUserServers = protectedProcedure.use(hasUserServers);
