import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import type { Context } from "elysia";

const { handler } = convexBetterAuthNextJs({
	convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL ?? "",
	convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "",
});

export async function handleAuth(c: Context) {
	const method = c.request.method;

	if (method === "GET") {
		return handler.GET(c.request);
	}
	if (method === "POST") {
		return handler.POST(c.request);
	}

	return new Response("Method not allowed", { status: 405 });
}
