import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildRoutingResult } from "@/lib/request-routing";

export const config = {
	matcher: [
		"/((?!api/|_next/|_static/|_vercel|discord/|featured-communities/|uwu/|[\\w-]+\\.\\w+).*)",
		"/sitemap.xml",
		"/robots.txt",
	],
};

export function proxy(request: NextRequest) {
	const result = buildRoutingResult({
		method: request.method,
		host: request.headers.get("host") ?? "",
		pathname: request.nextUrl.pathname,
		search: request.nextUrl.search,
		acceptHeader: request.headers.get("accept") ?? "",
		url: request.url,
		bypassSubpathRedirect:
			request.headers.get("X-AnswerOverflow-Skip-Subpath-Redirect") !== null,
	});

	if (result.type === "next") {
		return NextResponse.next();
	}

	if (result.type === "redirect") {
		return NextResponse.redirect(result.location, result.status);
	}

	const url = request.nextUrl.clone();
	url.pathname = result.pathname;
	return NextResponse.rewrite(url);
}
