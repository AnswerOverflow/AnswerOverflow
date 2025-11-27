import { nextJsHandler } from "@convex-dev/better-auth/nextjs";
import type { Context } from "hono";

export async function handleAuth(c: Context) {
	const method = c.req.method;
	const request = c.req.raw;

	const handler = nextJsHandler();

	if (method === "GET") {
		return handler.GET(request);
	}
	if (method === "POST") {
		return handler.POST(request);
	}

	return c.text("Method not allowed", 405);
}
