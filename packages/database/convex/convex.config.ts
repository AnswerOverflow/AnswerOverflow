import actionCache from "@convex-dev/action-cache/convex.config";
import betterAuth from "@convex-dev/better-auth/convex.config";
import migrations from "@convex-dev/migrations/convex.config";
import { defineApp } from "convex/server";

const app: ReturnType<typeof defineApp> = defineApp();
app.use(betterAuth);
app.use(actionCache);
app.use(migrations);

export default app;
