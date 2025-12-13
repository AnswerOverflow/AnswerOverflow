import { nextJsHandler } from "@convex-dev/better-auth/nextjs";
import type { Context } from "hono";

function createRequestWithoutHost(request: Request): Request {
	const headers = new Headers(request.headers);
	headers.delete("host");
	return new Request(request.url, {
		method: request.method,
		headers,
		body: request.body,
		// @ts-expect-error duplex is required for streaming bodies but not in all TS types
		duplex: "half",
	});
}

export async function handleAuth(c: Context) {
	const method = c.req.method;
	const request = createRequestWithoutHost(c.req.raw);

	const handler = nextJsHandler();

	if (method === "GET") {
		return handler.GET(request);
	}
	if (method === "POST") {
		return handler.POST(request);
	}

	return c.text("Method not allowed", 405);
}
