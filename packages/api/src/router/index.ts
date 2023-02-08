import { router } from "./trpc";
import { auth_router } from "./auth";
import { channel_router } from "~api/router/channel/channel";
import { message_router } from "~api/router/message/message";
import { server_router } from "~api/router/server/server";
import { discord_account_router } from "./users/accounts/discord-accounts";
import { user_server_settings_router } from "./user-server-settings/user-server-settings";
import { user_router } from "./users/user/user";
import { message_page_router } from "./pages/message-page";
export const bot_router = router({
  // Discord:
  servers: server_router,
  channels: channel_router,
  discord_accounts: discord_account_router,
  user_server_settings: user_server_settings_router,
  messages: message_router,

  // Other:
  users: user_router,
});

export const app_router = router({
  servers: server_router,
  channels: channel_router,
  discord_accounts: discord_account_router,
  user_server_settings: user_server_settings_router,
  messages: message_router,
  message_page: message_page_router,

  // Other:
  users: user_router,
  auth: auth_router,
});

// export type definition of API
export type AppRouter = typeof app_router;
