import { router } from "./trpc";
import { authRouter } from "./auth";
import { channelRouter } from "~api/router/channel/channel";
import { messageRouter } from "~api/router/message/message";
import { serverRouter } from "~api/router/server/server";
import { discordAccountRouter } from "./users/accounts/discord-accounts";
import { userServerSettingsRouter } from "./user-server-settings/user-server-settings";
import { userRouter } from "./users/user/user";
import { messagePageRouter } from "./pages/message-page";
import { ignoredDiscordAccountRouter } from "./users/ignored-discord-accounts/ignored-discord-account";
export const botRouter = router({
  // Discord:
  servers: serverRouter,
  channels: channelRouter,
  discordAccounts: discordAccountRouter,
  ignoredDiscordAccounts: ignoredDiscordAccountRouter,
  userServerSettings: userServerSettingsRouter,
  messages: messageRouter,

  // Other:
  users: userRouter,
});

export const appRouter = router({
  servers: serverRouter,
  channels: channelRouter,
  discordAccounts: discordAccountRouter,
  userServerSettings: userServerSettingsRouter,
  messages: messageRouter,
  messagePage: messagePageRouter,

  // Other:
  users: userRouter,
  auth: authRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
