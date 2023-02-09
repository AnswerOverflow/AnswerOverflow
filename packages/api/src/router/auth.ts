import {
  withDiscordAccountProcedure,
  withUserServersProcedure,
  publicProcedure,
  router,
} from "./trpc";

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  getSecretMessage: withDiscordAccountProcedure.query(() => {
    // testing type validation of overridden next-auth Session in @answeroverflow/auth package
    return "you can see this secret message!";
  }),
  getServers: withUserServersProcedure.query(({ ctx }) => {
    return ctx.userServers;
  }),
  // TODO: Cache
  getDiscordAccount: withDiscordAccountProcedure.query(({ ctx }) => {
    return ctx.discordAccount;
  }),
});
