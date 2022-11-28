import { router } from "../trpc";
import { userRouter } from "./user";
import { authRouter } from "./auth";

export const appRouter = router({
  post: userRouter,
  auth: authRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
