import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import type { Context } from "hono";

const { handler } = convexBetterAuthNextJs({
	convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL ?? "",
	convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "",
});

export async function handleAuth(c: Context) {
	const method = c.req.method;

	if (method === "GET") {
		return handler.GET(c.req.raw);
	}
	if (method === "POST") {
		return handler.POST(c.req.raw);
	}

	return c.text("Method not allowed", 405);
}
