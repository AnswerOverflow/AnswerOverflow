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

const PRODUCTION_ORIGIN = "https://www.answeroverflow.com";

function isAllowedDevOrigin(origin: string | undefined): boolean {
	if (!origin) return false;
	return ALLOWED_DEV_ORIGINS.some((pattern) => pattern.test(origin));
}

function isDevAuthPageReferer(referer: string | undefined): boolean {
	if (!referer) return false;
	try {
		const url = new URL(referer);
		return url.origin === PRODUCTION_ORIGIN && url.pathname === "/dev-auth";
	} catch {
		return false;
	}
}

function isLocalhostRequest(requestUrl: string): boolean {
	try {
		const url = new URL(requestUrl);
		return (
			url.hostname === "localhost" ||
			url.hostname === "127.0.0.1" ||
			url.hostname === "::1"
		);
	} catch {
		return false;
	}
}

// app.get("/dev/auth/get-jwt", async (c) => {
// 	const referer = c.req.header("Referer");
// 	if (!isDevAuthPageReferer(referer)) {
// 		return c.text("Forbidden: Must be called from /dev-auth page", 403);
// 	}

// 	const state = c.req.query("state");
// 	if (!state || !/^[0-9a-f]{64}$/.test(state)) {
// 		return c.text("Bad Request: Invalid or missing state parameter", 400);
// 	}

// 	const cookies = getCookie(c);

// 	const sessionToken =
// 		cookies["better-auth.session_token"] ??
// 		cookies["__Secure-better-auth.session_token"];
// 	if (!sessionToken) {
// 		return c.text("Unauthorized: No session found", 401);
// 	}

// 	const authCookieNames = [
// 		"better-auth.session_token",
// 		"better-auth.convex_jwt",
// 		"__Secure-better-auth.session_token",
// 		"__Secure-better-auth.convex_jwt",
// 	];

// 	const authCookies: Record<string, string> = {};
// 	for (const [key, value] of Object.entries(cookies)) {
// 		if (authCookieNames.includes(key)) {
// 			authCookies[key] = value;
// 		}
// 	}

// 	const token = Buffer.from(JSON.stringify(authCookies)).toString("base64url");
// 	return c.text(token);
// });

// app.post("/dev/auth/set-token", async (c) => {
// 	const origin = c.req.header("Origin");
// 	if (!isAllowedDevOrigin(origin)) {
// 		return c.json(
// 			{ error: "Forbidden: This endpoint is only available for localhost" },
// 			403,
// 		);
// 	}

// 	const body = await c.req.json();
// 	const { token } = body;

// 	if (!token || typeof token !== "string") {
// 		return c.json({ error: "Invalid or missing token" }, 400);
// 	}

// 	let cookies: Record<string, string>;
// 	try {
// 		const decoded = Buffer.from(token, "base64url").toString("utf-8");
// 		cookies = JSON.parse(decoded);
// 		if (typeof cookies !== "object" || cookies === null) {
// 			return c.json({ error: "Invalid token format" }, 400);
// 		}
// 	} catch {
// 		return c.json({ error: "Invalid token format" }, 400);
// 	}

// 	const isLocalhost = isLocalhostRequest(c.req.url);
// 	const setCookieHeaders: string[] = [];

// 	for (const [key, value] of Object.entries(cookies)) {
// 		if (typeof value !== "string") continue;

// 		const decodedValue = decodeURIComponent(value);

// 		const cookieAttrs = [
// 			"Path=/",
// 			"HttpOnly",
// 			"SameSite=Lax",
// 			`Max-Age=${60 * 60 * 24 * 7}`,
// 		];

// 		const needsSecure = key.startsWith("__Secure-") || !isLocalhost;
// 		if (needsSecure) {
// 			cookieAttrs.push("Secure");
// 		}

// 		const cookieHeader = `${key}=${decodedValue}; ${cookieAttrs.join("; ")}`;
// 		setCookieHeaders.push(cookieHeader);
// 	}

// 	const response = c.json({ success: true });
// 	for (const header of setCookieHeaders) {
// 		response.headers.append("Set-Cookie", header);
// 	}
// 	return response;
// });

// app.post("/dev/auth/clear-cookies", async (c) => {
// 	const origin = c.req.header("Origin");
// 	if (!isAllowedDevOrigin(origin)) {
// 		return c.json(
// 			{ error: "Forbidden: This endpoint is only available for localhost" },
// 			403,
// 		);
// 	}

// 	const authCookieNames = [
// 		"better-auth.session_token",
// 		"better-auth.convex_jwt",
// 		"better-auth.state",
// 		"__Secure-better-auth.session_token",
// 		"__Secure-better-auth.convex_jwt",
// 		"__Secure-better-auth.state",
// 	];

// 	const setCookieHeaders: string[] = [];
// 	for (const cookieName of authCookieNames) {
// 		const needsSecure = cookieName.startsWith("__Secure-");
// 		const cookieAttrs = ["Path=/", "Expires=Thu, 01 Jan 1970 00:00:01 GMT"];
// 		if (needsSecure) {
// 			cookieAttrs.push("Secure");
// 		}
// 		setCookieHeaders.push(`${cookieName}=; ${cookieAttrs.join("; ")}`);
// 	}

// 	const response = c.json({ success: true });
// 	for (const header of setCookieHeaders) {
// 		response.headers.append("Set-Cookie", header);
// 	}
// 	return response;
// });

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
