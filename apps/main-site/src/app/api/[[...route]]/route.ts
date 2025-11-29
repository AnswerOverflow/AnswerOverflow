import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { handle } from "hono/vercel";
import { handleAuth } from "../handlers/auth";
import { handleConvexWebhook } from "../handlers/convex-webhooks";

const app = new Hono().basePath("/api");

app.post("/v1/webhooks/convex", handleConvexWebhook);

app.on(["GET", "POST"], "/auth/*", handleAuth);

const ALLOWED_DEV_ORIGINS = [
	/^http:\/\/localhost(:\d+)?$/,
	/^http:\/\/127\.0\.0\.1(:\d+)?$/,
	/^http:\/\/\[::1\](:\d+)?$/,
];

function isAllowedDevOrigin(origin: string | undefined): boolean {
	if (!origin) return false;
	return ALLOWED_DEV_ORIGINS.some((pattern) => pattern.test(origin));
}

app.get("/dev/auth/get-jwt", async (c) => {
	const cookies = getCookie(c);

	const sessionToken =
		cookies["better-auth.session_token"] ??
		cookies["__Secure-better-auth.session_token"];
	if (!sessionToken) {
		return c.text("Unauthorized: No session found", 401);
	}

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
	const origin = c.req.header("Origin");
	if (!isAllowedDevOrigin(origin)) {
		return c.json(
			{ error: "Forbidden: This endpoint is only available for localhost" },
			403,
		);
	}

	const { setCookie } = await import("hono/cookie");
	const body = await c.req.json();
	const token = body.token;

	if (!token) {
		return c.json({ error: "No token provided" }, 400);
	}

	if (typeof token !== "string") {
		return c.json({ error: "Token must be a string" }, 400);
	}

	try {
		const decoded = Buffer.from(token, "base64url").toString("utf-8");
		const cookies = JSON.parse(decoded);

		if (typeof cookies !== "object" || cookies === null) {
			return c.json({ error: "Invalid token format: expected object" }, 400);
		}

		for (const [key, value] of Object.entries(cookies)) {
			if (typeof value !== "string") {
				console.warn(`Skipping non-string cookie value for key: ${key}`);
				continue;
			}
			setCookie(c, key, value, {
				path: "/",
				secure: false,
				httpOnly: true,
				sameSite: "Lax",
			});
		}

		return c.json({ success: true });
	} catch (error) {
		console.error(
			"Error parsing token:",
			error,
			"Token preview:",
			token.slice(0, 50),
		);
		return c.json({ error: "Invalid token", details: String(error) }, 400);
	}
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
