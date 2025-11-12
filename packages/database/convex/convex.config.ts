import betterAuth from "@convex-dev/better-auth/convex.config";
import { defineApp } from "convex/server";

const app: ReturnType<typeof defineApp> = defineApp();
app.use(betterAuth);

export default app;
