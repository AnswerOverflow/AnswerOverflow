import { getDiscordAccount } from "../utils/discord-operations";
import { authedProcedure, authedProcedureWithUserServers, publicProcedure, router } from "./trpc";

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  getSecretMessage: authedProcedure.query(() => {
    // testing type validation of overridden next-auth Session in @answeroverflow/auth package
    return "you can see this secret message!";
  }),
  getServers: authedProcedureWithUserServers.query(({ ctx }) => {
    return ctx.user_servers;
  }),
  // TODO: Cache
  getDiscordAccount: authedProcedure.query(async ({ ctx }) => {
    return await getDiscordAccount(ctx.prisma, ctx.session.user.id);
  }),
});
