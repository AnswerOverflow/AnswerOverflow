import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { handle } from "hono/vercel";
import { handleAuth } from "../handlers/auth";
import { handleConvexWebhook } from "../handlers/convex-webhooks";

const app = new Hono().basePath("/api");

app.post("/v1/webhooks/convex", handleConvexWebhook);

app.use("/auth/*", async (c, next) => {
	const path = c.req.path;
	if (path.includes("/get-session") || path.includes("/convex/token")) {
		const cookies = getCookie(c);
		console.log(`[auth] ${path} - cookies:`, {
			session: cookies["better-auth.session_token"]?.slice(0, 20),
			secureSession: cookies["__Secure-better-auth.session_token"]?.slice(
				0,
				20,
			),
			jwt: cookies["better-auth.convex_jwt"] ? "present" : "missing",
			secureJwt: cookies["__Secure-better-auth.convex_jwt"]
				? "present"
				: "missing",
		});
	}
	await next();
});

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

	console.log("[dev-auth] get-jwt - All cookies:", Object.keys(cookies));

	const sessionToken =
		cookies["better-auth.session_token"] ??
		cookies["__Secure-better-auth.session_token"];
	if (!sessionToken) {
		return c.text("Unauthorized: No session found", 401);
	}

	console.log(
		"[dev-auth] get-jwt - Session token found, length:",
		sessionToken.length,
	);

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
			console.log(
				`[dev-auth] get-jwt - Including cookie: ${key}, value length: ${value.length}, preview: ${value.slice(0, 30)}`,
			);
		}
	}

	const token = Buffer.from(JSON.stringify(authCookies)).toString("base64url");

	console.log("[dev-auth] get-jwt - Encoded token length:", token.length);
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
		console.error("[dev-auth] Token is not a string:", typeof token);
		return c.json({ error: "Token must be a string" }, 400);
	}

	console.log(
		"[dev-auth] Token received, length:",
		token.length,
		"preview:",
		token.slice(0, 30),
	);

	try {
		const decoded = Buffer.from(token, "base64url").toString("utf-8");
		console.log("[dev-auth] Decoded token preview:", decoded.slice(0, 100));
		const cookies = JSON.parse(decoded);

		if (typeof cookies !== "object" || cookies === null) {
			return c.json({ error: "Invalid token format: expected object" }, 400);
		}

		console.log("[dev-auth] Setting cookies:", Object.keys(cookies));

		const isLocalhost = c.req.url.includes("localhost");
		const setCookieHeaders: string[] = [];

		for (const [key, value] of Object.entries(cookies)) {
			if (typeof value !== "string") {
				console.warn(`Skipping non-string cookie value for key: ${key}`);
				continue;
			}

			const cookieAttrs = [
				"Path=/",
				"HttpOnly",
				"SameSite=Lax",
				`Max-Age=${60 * 60 * 24 * 7}`,
			];

			if (!isLocalhost) {
				cookieAttrs.push("Secure");
			}

			const cookieHeader = `${key}=${value}; ${cookieAttrs.join("; ")}`;
			setCookieHeaders.push(cookieHeader);

			console.log(
				`[dev-auth] Setting cookie: ${key}, secure: ${!isLocalhost}, value length: ${value.length}, preview: ${value.slice(0, 30)}`,
			);
		}

		console.log("[dev-auth] Successfully set all cookies");

		const response = c.json({ success: true });
		for (const header of setCookieHeaders) {
			response.headers.append("Set-Cookie", header);
		}
		return response;
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
