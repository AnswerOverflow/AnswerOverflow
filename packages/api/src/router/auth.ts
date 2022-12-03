import {
  protectedProcedure,
  protectedProcedureWithUserServers,
  publicProcedure,
  router,
} from "../trpc";
import { getDiscordAccount } from "../utils/discord-oauth";

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  getSecretMessage: protectedProcedure.query(() => {
    // testing type validation of overridden next-auth Session in @answeroverflow/auth package
    return "you can see this secret message!";
  }),
  getServers: protectedProcedureWithUserServers.query(({ ctx }) => {
    return ctx.user_servers;
  }),
  // TODO: Cache
  getDiscordAccount: protectedProcedure.query(async ({ ctx }) => {
    return await getDiscordAccount(ctx.prisma, ctx.session.user.id);
  }),
});
