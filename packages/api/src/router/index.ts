import { router } from "../trpc";
import { authRouter } from "./auth";
import { channelRouter } from "./channel";
import { channelSettingsRouter } from "./channel_settings";
import { serverRouter } from "./server";
import { userRouter } from "./user";

export const botRouter = router({
  users: userRouter,
  servers: serverRouter,
  channels: channelRouter,
  channel_settings: channelSettingsRouter,
});

export const appRouter = router({
  post: userRouter,
  auth: authRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
