import { router } from "../trpc";
import { authRouter } from "./auth";
import { channelRouter } from "./channel";
import { channelSettingsRouter } from "./channel_settings";

//import { messageRouter } from "./message";
import { serverRouter } from "./server";
import { userRouter } from "./user";

export const botRouter = router({
  users: userRouter,
  servers: serverRouter,
  channels: channelRouter,
  channel_settings: channelSettingsRouter,
  //messages: messageRouter,
});

export const appRouter = router({
  servers: serverRouter,
  auth: authRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
