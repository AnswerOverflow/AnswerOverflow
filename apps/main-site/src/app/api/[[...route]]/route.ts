import { getConvexJwtFromHeaders } from "@packages/database/convex-client-live";
import { Hono } from "hono";
import { handle } from "hono/vercel";
import { handleAuth } from "../handlers/auth";
import { handleConvexWebhook } from "../handlers/convex-webhooks";

const app = new Hono().basePath("/api");

app.post("/v1/webhooks/convex", handleConvexWebhook);

app.on(["GET", "POST"], "/auth/*", handleAuth);

app.get("/dev/auth/get-jwt", async (c) => {
	c.req.raw.headers.getSetCookie;
	const jwt = getConvexJwtFromHeaders(
		c.req.raw.headers.get("cookie")?.split(";") ?? [],
	);
	// return as set-cookie header
	if (!jwt) {
		return c.json({ error: "No JWT found" }, 400);
	}
	return c.text(`${jwt.name}=${jwt.value}`);
});

app.get("/dev/auth/redirect", async (c) => {
	// pass token in query params as ?={cookie name}={cookie value}
	// parse query params
	// redirect to redirect url with token set as cookie
	const cookie = c.req.query("token");
	const redirect = c.req.query("redirect");
	if (!cookie || !redirect) {
		return c.json({ error: "No token provided" }, 400);
	}
	c.res.headers.set("Set-Cookie", cookie);
	return c.redirect(redirect);
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
