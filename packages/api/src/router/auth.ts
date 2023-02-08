import {
  with_discord_account_procedure,
  with_user_servers_procedure,
  public_procedure,
  router,
} from "./trpc";

export const auth_router = router({
  getSession: public_procedure.query(({ ctx }) => {
    return ctx.session;
  }),
  getSecretMessage: with_discord_account_procedure.query(() => {
    // testing type validation of overridden next-auth Session in @answeroverflow/auth package
    return "you can see this secret message!";
  }),
  getServers: with_user_servers_procedure.query(({ ctx }) => {
    return ctx.user_servers;
  }),
  // TODO: Cache
  getDiscordAccount: with_discord_account_procedure.query(({ ctx }) => {
    return ctx.discord_account;
  }),
});
