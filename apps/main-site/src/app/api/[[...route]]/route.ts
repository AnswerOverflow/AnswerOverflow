import { Hono } from "hono";
import { handle } from "hono/vercel";
import { handleAuth } from "../handlers/auth";
import { handleConvexWebhook } from "../handlers/convex-webhooks";
import { handleAnonymousSession } from "../handlers/handle-anonymous-session";

const app = new Hono().basePath("/api");

app.post("/v1/webhooks/convex", handleConvexWebhook);
app.get("/auth/anonymous-session", handleAnonymousSession);

app.on(["GET", "POST"], "/auth/*", handleAuth);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
