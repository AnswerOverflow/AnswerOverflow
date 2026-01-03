import { isIP } from "node:net";
import {
	extractLocalhostSubdomain,
	isOnMainSite,
	parseAnswerOverflowAppDomain,
} from "@packages/ui/utils/links";
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
	const pathname = url.pathname;
	const search = url.search;
	const path = pathname + search;
	const host = request.headers.get("host") ?? "";

	const acceptHeader = request.headers.get("accept") ?? "";
	const prefersMarkdown =
		acceptHeader.includes("text/markdown") ||
		acceptHeader.includes("text/plain");

	const mdExtensionMatch = pathname.match(/^\/m\/(\d+)\.md$/);
	if (mdExtensionMatch) {
		url.pathname = `/m/${mdExtensionMatch[1]}/markdown`;
		return NextResponse.rewrite(url);
	}

	if (prefersMarkdown) {
		const messageMatch = pathname.match(/^\/m\/(\d+)$/);
		if (messageMatch) {
			url.pathname = `/m/${messageMatch[1]}/markdown`;
			return NextResponse.rewrite(url);
		}
	}

	if (pathname.startsWith("/og")) {
		return NextResponse.next();
	}

	// if (isOnMainSite(host) && isGitHubRepoUrl(pathname)) {
	// 	const match = pathname.match(GITHUB_OWNER_PATTERN);
	// 	if (match) {
	// 		const [, owner, repo, rest] = match;
	// 		url.pathname = `/chat/${owner}/${repo}${rest ?? ""}`;
	// 		return NextResponse.redirect(url);
	// 	}
	// }

	if (isOnMainSite(host)) {
		return NextResponse.next();
	}

	const localhostSubdomain = extractLocalhostSubdomain(host);
	if (localhostSubdomain) {
		const subpathTenant = subpathTenants.find(
			(tenant) => tenant.rewriteDomain === localhostSubdomain,
		);
		if (subpathTenant) {
			const pathnameWithoutSubpath = pathname.startsWith(
				`/${subpathTenant.subpath}`,
			)
				? pathname.slice(subpathTenant.subpath.length + 1) || "/"
				: pathname;
			url.pathname = `/${localhostSubdomain}${pathnameWithoutSubpath}`;
			return NextResponse.rewrite(url);
		}
		url.pathname = `/${localhostSubdomain}${pathname}`;
		return NextResponse.rewrite(url);
	}

	const parsedAppDomain = parseAnswerOverflowAppDomain(host);
	if (parsedAppDomain) {
		const pathnameWithoutSubpath = pathname.startsWith(
			`/${parsedAppDomain.subpath}`,
		)
			? pathname.slice(parsedAppDomain.subpath.length + 1) || "/"
			: pathname;
		url.pathname = `/${parsedAppDomain.domain}${pathnameWithoutSubpath}`;
		return NextResponse.rewrite(url);
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
	const pathnameWithoutHost = pathname.startsWith(`/${actualHost}`)
		? pathname.slice(actualHost.length + 1)
		: pathname;

	if (isIP(actualHost) === 0) {
		url.pathname = `/${actualHost}${pathnameWithoutHost}`;
		return NextResponse.rewrite(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!api/|_next/|_static/|_vercel|discord/|featured-communities/|uwu/|[\\w-]+\\.\\w+).*)",
		"/sitemap.xml",
		"/robots.txt",
	],
};
