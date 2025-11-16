import type { Context } from "hono";

import { handleAnonymousJWKS } from "./handle-anonymous-jwks";
import { handleAnonymousOpenIDConfig } from "./handle-anonymous-openid-config";
import { handleAnonymousSession } from "./handle-anonymous-session";

export async function handleAuth(c: Context) {
	const { nextJsHandler } = await import("@convex-dev/better-auth/nextjs");

	const method = c.req.method;
	const request = c.req.raw;
	const pathname = c.req.path;

	if (pathname === "/api/auth/anonymous-session") {
		return handleAnonymousSession(c);
	}

	if (pathname === "/api/auth/anonymous-session/jwks") {
		return handleAnonymousJWKS(c);
	}

	if (
		pathname === "/api/auth/anonymous-session/.well-known/openid-configuration"
	) {
		return handleAnonymousOpenIDConfig(c);
	}

	const handler = nextJsHandler();

	if (method === "GET") {
		return handler.GET(request);
	}
	if (method === "POST") {
		return handler.POST(request);
	}

	return c.text("Method not allowed", 405);
}
