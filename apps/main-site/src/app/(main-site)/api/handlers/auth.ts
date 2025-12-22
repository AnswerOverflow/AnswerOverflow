import type { Context } from "hono";

const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "";

function proxyToConvex(
	request: Request,
	originHost: string,
): Promise<Response> {
	const requestUrl = new URL(request.url);
	const convexUrl = `${convexSiteUrl}${requestUrl.pathname}${requestUrl.search}`;

	const headers = new Headers(request.headers);
	headers.set("accept-encoding", "application/json");
	headers.set("x-forwarded-host", originHost);
	headers.set(
		"x-forwarded-proto",
		originHost.includes("localhost") ? "http" : "https",
	);

	const newRequest = new Request(convexUrl, {
		method: request.method,
		headers,
		body: request.body,
		duplex: "half",
	} as RequestInit);

	return fetch(newRequest, { redirect: "manual" });
}

export async function handleAuth(c: Context) {
	const method = c.req.method;

	if (method !== "GET" && method !== "POST") {
		return c.text("Method not allowed", 405);
	}

	const host = c.req.header("host") ?? "www.answeroverflow.com";

	return proxyToConvex(c.req.raw, host);
}
