import { router } from "./trpc";
import { authRouter } from "./auth";
import { channelRouter } from "~api/router/channel/channel";
import { channelSettingsRouter } from "~api/router/channel/channel_settings";
import { messageRouter } from "~api/router/message/message";
import { serverRouter } from "~api/router/server/server";
import { serverSettingsRouter } from "./server/server_settings";
import { discordAccountRouter } from "./users/accounts/discord-accounts";
import { userServerSettingsRouter } from "./user-server-settings/user-server-settings";
import { userRouter } from "./users/user/user";
import { message_page_router } from "./pages/message-result";
export const botRouter = router({
  // Discord:
  servers: serverRouter,
  server_settings: serverSettingsRouter,
  channels: channelRouter,
  channel_settings: channelSettingsRouter,
  discord_accounts: discordAccountRouter,
  user_server_settings: userServerSettingsRouter,
  messages: messageRouter,

  // Other:
  users: userRouter,
});

export const appRouter = router({
  servers: serverRouter,
  server_settings: serverSettingsRouter,
  channels: channelRouter,
  channel_settings: channelSettingsRouter,
  discord_accounts: discordAccountRouter,
  user_server_settings: userServerSettingsRouter,
  messages: messageRouter,
  message_page: message_page_router,

  // Other:
  users: userRouter,
  auth: authRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
