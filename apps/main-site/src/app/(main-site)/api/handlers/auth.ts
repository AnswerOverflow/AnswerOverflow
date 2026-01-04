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

	if (method === "GET") {
		return handler.GET(c.request);
	}
	if (method === "POST") {
		return handler.POST(c.request);
	}

	return new Response("Method not allowed", { status: 405 });
}
