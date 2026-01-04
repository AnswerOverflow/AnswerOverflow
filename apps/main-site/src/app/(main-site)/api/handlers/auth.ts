import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { checkBotId } from "botid/server";
import type { Context } from "elysia";

const { handler } = convexBetterAuthNextJs({
	convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL ?? "",
	convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "",
});

async function checkForBot(): Promise<Response | null> {
	const verification = await checkBotId();

	if (verification.isBot) {
		return new Response(JSON.stringify({ error: "Access denied" }), {
			status: 403,
			headers: { "Content-Type": "application/json" },
		});
	}

	return null;
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

	if (
		url.pathname === "/api/auth/anonymous-session" ||
		url.pathname === "/api/auth/sign-in/anonymous"
	) {
		const botResponse = await checkForBot();
		if (botResponse) return botResponse;
	}

	if (method === "GET") {
		return handler.GET(c.request);
	}
	if (method === "POST") {
		return handler.POST(c.request);
	}

	return new Response("Method not allowed", { status: 405 });
}
