import { router } from "./trpc";
import { authRouter } from "./auth";
import { channelRouter } from "~api/router/channel/channel";
import { channelSettingsRouter } from "~api/router/channel/channel_settings";
import { messageRouter } from "~api/router/message/message";
import { serverRouter } from "~api/router/server/server";
import { userRouter } from "~api/router/user/user";

export const botRouter = router({
  users: userRouter,
  servers: serverRouter,
  channels: channelRouter,
  channel_settings: channelSettingsRouter,
  messages: messageRouter,
});

export const appRouter = router({
  servers: serverRouter,
  auth: authRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
