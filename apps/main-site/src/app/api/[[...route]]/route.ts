import { Hono } from "hono";
import { getCookie } from "hono/cookie";
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

app.post("/dev/auth/set-token", async (c) => {
	const { setCookie } = await import("hono/cookie");
	const body = await c.req.json();
	const token = body.token;

	if (!token) {
		return c.json({ error: "No token provided" }, 400);
	}

	try {
		const cookies = JSON.parse(
			Buffer.from(token, "base64url").toString("utf-8"),
		);
		const isLocalhost = c.req.url.includes("localhost");

		for (const [key, value] of Object.entries(cookies)) {
			const isSecureCookie = key.startsWith("__Secure-");
			setCookie(c, key, value as string, {
				path: "/",
				secure: isSecureCookie ? true : !isLocalhost,
				httpOnly: true,
				sameSite: "Lax",
			});
		}

		return c.json({ success: true });
	} catch (error) {
		console.error("Error parsing token:", error);
		return c.json({ error: "Invalid token", details: String(error) }, 400);
	}
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
