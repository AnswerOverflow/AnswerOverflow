import betterAuth from "@convex-dev/better-auth/convex.config";
import actionCache from "@convex-dev/action-cache/convex.config";
import { defineApp } from "convex/server";

const app: ReturnType<typeof defineApp> = defineApp();
app.use(betterAuth);
app.use(actionCache);

export default app;
