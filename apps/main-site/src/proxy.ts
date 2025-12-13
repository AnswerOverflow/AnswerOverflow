import { isIP } from "node:net";
import { isOnMainSite } from "@packages/ui/utils/links";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const subpathTenants = [
	{
		contentDomain: "community.migaku.com",
		rewriteDomain: "migaku.com",
		subpath: "community",
	},
	{
		contentDomain: "testing.rhys.ltd",
		rewriteDomain: "rhys.ltd",
		subpath: "idk",
	},
	{
		contentDomain: "discord.vapi.ai",
		rewriteDomain: "vapi.ai",
		subpath: "community",
	},
];

export function proxy(request: NextRequest) {
	const url = request.nextUrl;
	const path = url.pathname + url.search;
	const host = request.headers.get("host") ?? "";

	if (path.startsWith("/og") || path.startsWith("/ingest")) {
		return NextResponse.next();
	}

	if (isOnMainSite(host)) {
		return NextResponse.next();
	}

	const subpathTenant = subpathTenants.find((tenant) =>
		host.includes(tenant.contentDomain),
	);

	if (subpathTenant) {
		const bypass = request.headers.get(
			"X-AnswerOverflow-Skip-Subpath-Redirect",
		);
		if (!bypass && !subpathTenant.contentDomain.includes("vapi.ai")) {
			return NextResponse.redirect(
				new URL(
					`https://${subpathTenant.rewriteDomain}/${subpathTenant.subpath}${path}`,
					request.url,
				),
				308,
			);
		}
	}

	const actualHost = subpathTenant?.rewriteDomain ?? host;
	const pathWithoutHost = path.startsWith(`/${actualHost}`)
		? path.slice(actualHost.length + 1)
		: path;

	if (isIP(actualHost) === 0) {
		url.pathname = `/${actualHost}${pathWithoutHost}`;
		url.search = "";
		return NextResponse.rewrite(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
		"/sitemap.xml",
		"/robots.txt",
	],
};
