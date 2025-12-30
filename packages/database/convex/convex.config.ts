import actionCache from "@convex-dev/action-cache/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config";
import migrations from "@convex-dev/migrations/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import agent from "@packages/agent/convex.config";
import { defineApp } from "convex/server";
import betterAuth from "./betterAuth/convex.config";

const app: ReturnType<typeof defineApp> = defineApp();
app.use(betterAuth);
app.use(actionCache);
app.use(migrations);
app.use(rateLimiter);
app.use(agent);
app.use(aggregate, { name: "rootChannelMessageCounts" });
app.use(aggregate, { name: "threadMessageCounts" });
app.use(aggregate, { name: "threadCounts" });

export default app;
