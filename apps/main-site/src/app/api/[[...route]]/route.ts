import { getConvexJwtFromHeaders } from "@packages/database/convex-client-live";
import { Hono } from "hono";
import { handle } from "hono/vercel";
import { handleAuth } from "../handlers/auth";
import { handleConvexWebhook } from "../handlers/convex-webhooks";

const app = new Hono().basePath("/api");

app.post("/v1/webhooks/convex", handleConvexWebhook);

app.on(["GET", "POST"], "/auth/*", handleAuth);

app.get("/dev/auth/get-jwt", async (c) => {
	const reqCookies = c.req.raw.headers.get("cookie")?.split(";") ?? [];
	const authCookieNames = [
		"better-auth.session_token",
		"better-auth.convex_jwt",
		"better-auth.state",
	];
	let setCookieHeader = "";
	for (const cookie of reqCookies) {
		const name = cookie.split("=")[0];
		if (name && authCookieNames.includes(name)) {
			setCookieHeader += `${name}=${cookie.split("=")[1]}; `;
		}
	}

	return c.text(setCookieHeader);
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
