import { router } from "./trpc";
import { authRouter } from "./auth";
import { channelRouter } from "./channel";
import { serverRouter } from "./server";
import { discordAccountRouter } from "./discord-accounts";
import { userServerSettingsRouter } from "./user-server-settings";
import { messagesRouter } from "./messages";
import { dashboardRouter } from "./dashboard";

// TODO: just have one router
export const botRouter = router({
  // Discord:
  servers: serverRouter,
  channels: channelRouter,
  discordAccounts: discordAccountRouter,
  userServerSettings: userServerSettingsRouter,
});
export const appRouter = router({
  servers: serverRouter,
  channels: channelRouter,
  discordAccounts: discordAccountRouter,
  userServerSettings: userServerSettingsRouter,
  messages: messagesRouter,
  dashboard: dashboardRouter,

  // Other:
  auth: authRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
