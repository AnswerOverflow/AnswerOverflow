import { Elysia } from "elysia";
import { handleAuth } from "../handlers/auth";
import { handleConvexWebhook } from "../handlers/convex-webhooks";

const app = new Elysia({ prefix: "/api" })
	.post("/v1/webhooks/convex", handleConvexWebhook)
	.all("/auth/*", handleAuth);

export const GET = app.fetch;
export const POST = app.fetch;
export const PUT = app.fetch;
export const DELETE = app.fetch;
export const PATCH = app.fetch;
