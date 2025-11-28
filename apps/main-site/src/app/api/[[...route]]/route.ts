import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { handle } from "hono/vercel";
import { handleAuth } from "../handlers/auth";
import { handleConvexWebhook } from "../handlers/convex-webhooks";

const app = new Hono().basePath("/api");

app.post("/v1/webhooks/convex", handleConvexWebhook);

app.on(["GET", "POST"], "/auth/*", handleAuth);

app.get("/dev/auth/get-jwt", async (c) => {
	const cookies = getCookie(c);
	const authCookieNames = [
		"better-auth.session_token",
		"better-auth.convex_jwt",
		"better-auth.state",
		"__Secure-better-auth.session_token",
		"__Secure-better-auth.convex_jwt",
		"__Secure-better-auth.state",
	];

	const authCookies: Record<string, string> = {};
	for (const [key, value] of Object.entries(cookies)) {
		if (authCookieNames.includes(key)) {
			authCookies[key] = value;
		}
	}

	const token = Buffer.from(JSON.stringify(authCookies)).toString("base64url");

	return c.text(token);
});

app.get("/dev/auth/redirect", async (c) => {
	// pass token in query params as base64 encoded json
	// parse query params
	// redirect to redirect url with token set as cookie
	const token = c.req.query("token");
	const redirect = c.req.query("redirect");
	if (!token || !redirect) {
		return c.json({ error: "No token provided" }, 400);
	}

	try {
		const cookies = JSON.parse(
			Buffer.from(token, "base64url").toString("utf-8"),
		);
		const isLocalhost = c.req.url.includes("localhost");
		for (const [key, value] of Object.entries(cookies)) {
			setCookie(c, key, value as string, {
				path: "/",
				secure: !isLocalhost,
				httpOnly: true,
				sameSite: "Lax",
			});
		}
	} catch {
		return c.json({ error: "Invalid token" }, 400);
	}

	return c.redirect(redirect);
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
