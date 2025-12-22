import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import type { Context } from "hono";

const { handler } = convexBetterAuthNextJs({
	convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL ?? "",
	convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "",
});

export async function handleAuth(c: Context) {
	const method = c.req.method;

	const forwardedHost =
		c.req.header("x-forwarded-host") ?? "www.answeroverflow.com";
	const forwardedProto = c.req.header("x-forwarded-proto") ?? "https";
	c.req.raw.headers.set("x-forwarded-host", forwardedHost);
	c.req.raw.headers.set("x-forwarded-proto", forwardedProto);
	c.req.raw.headers.set("host", forwardedHost);
	c.req.raw.headers.set("protocol", forwardedProto);

	if (method === "GET") {
		return handler.GET(c.req.raw);
	}
	if (method === "POST") {
		return handler.POST(c.req.raw);
	}

	return c.text("Method not allowed", 405);
}
