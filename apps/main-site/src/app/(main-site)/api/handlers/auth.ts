import type { IncomingHttpHeaders } from "node:http";
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { checkBotId } from "botid/server";
import type { Context } from "elysia";

const { handler } = convexBetterAuthNextJs({
	convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL ?? "",
	convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "",
});

function getHeadersFromRequest(request: Request): IncomingHttpHeaders {
	const headers: IncomingHttpHeaders = {};
	request.headers.forEach((value, key) => {
		headers[key.toLowerCase()] = value;
	});
	return headers;
}

async function checkForBot(request: Request): Promise<boolean> {
	try {
		const verification = await checkBotId({
			advancedOptions: {
				headers: getHeadersFromRequest(request),
			},
		});
		return verification.isBot;
	} catch {
		return false;
	}
}

// Vercel's router can leak Next.js-internal query params (e.g. nxtPslugs from
// the /api/[[...slugs]] catch-all) into the request URL; they must not be
// forwarded to Convex.
const NEXT_INTERNAL_PARAM_PREFIXES = ["nxtP", "nxtI"];

export function stripNextInternalParams(url: URL): URL {
	const cleaned = new URL(url);
	for (const key of [...cleaned.searchParams.keys()]) {
		if (NEXT_INTERNAL_PARAM_PREFIXES.some((prefix) => key.startsWith(prefix))) {
			cleaned.searchParams.delete(key);
		}
	}
	return cleaned;
}

function isNetworkFetchError(error: unknown): boolean {
	return (
		error instanceof TypeError ||
		(error instanceof Error && error.message === "fetch failed")
	);
}

// The upstream handler forwards this request to Convex as a fetch with a
// streamed body, which undici cannot replay if the pooled connection to Convex
// was closed by the peer — the request dies with `TypeError: fetch failed`
// before anything reaches Convex. Buffer the body so each attempt is
// self-contained, and retry once on a network-level failure (no response was
// received, so retrying is safe).
export async function proxyToConvex(request: Request): Promise<Response> {
	const url = stripNextInternalParams(new URL(request.url));
	const bodyBuffer =
		request.method === "GET" || request.method === "HEAD"
			? undefined
			: await request.arrayBuffer();
	const makeRequest = () => {
		// Hop-by-hop / body-framing headers describe the incoming stream, not the
		// buffered body we forward; undici rejects chunked transfer-encoding on a
		// buffered request, so drop them and let fetch set Content-Length.
		const headers = new Headers(request.headers);
		headers.delete("transfer-encoding");
		headers.delete("content-length");
		headers.delete("connection");
		headers.delete("keep-alive");
		return new Request(url, {
			method: request.method,
			headers,
			// Copy so undici/fetch cannot detach the buffer across retries
			body: bodyBuffer ? bodyBuffer.slice(0) : undefined,
		});
	};
	const proxy = request.method === "GET" ? handler.GET : handler.POST;
	try {
		return await proxy(makeRequest());
	} catch (error) {
		if (!isNetworkFetchError(error)) throw error;
		console.error(
			"Auth proxy request to Convex failed, retrying once:",
			error,
			error instanceof Error ? error.cause : undefined,
		);
		try {
			return await proxy(makeRequest());
		} catch (retryError) {
			console.error(
				"Auth proxy retry failed:",
				retryError,
				retryError instanceof Error ? retryError.cause : undefined,
			);
			return new Response(
				JSON.stringify({ message: "Unable to reach auth service" }),
				{ status: 502, headers: { "Content-Type": "application/json" } },
			);
		}
	}
}

export async function handleAuth(c: Context) {
	const method = c.request.method;
	const url = new URL(c.request.url);

	if (
		url.pathname === "/api/auth/callback/github" &&
		(url.searchParams.has("setup_action") ||
			(url.searchParams.has("installation_id") &&
				!url.searchParams.has("state")))
	) {
		return Response.redirect(new URL("/dashboard/settings", url.origin));
	}

	const isAnonRoute =
		url.pathname === "/api/auth/anonymous-session" ||
		url.pathname === "/api/auth/sign-in/anonymous";

	if (isAnonRoute) {
		const isBot = await checkForBot(c.request);
		if (isBot) {
			return new Response(JSON.stringify({ error: "Access denied" }), {
				status: 403,
				headers: { "Content-Type": "application/json" },
			});
		}
	}

	if (method === "GET" || method === "POST") {
		return proxyToConvex(c.request);
	}

	return new Response("Method not allowed", { status: 405 });
}
