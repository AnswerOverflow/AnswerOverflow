import {
	extractLocalhostSubdomain,
	isOnMainSite,
	parseAnswerOverflowAppDomain,
} from "@packages/ui/utils/links";

type RoutingInput = {
	method: string;
	host: string;
	pathname: string;
	search: string;
	acceptHeader: string;
	url: string;
	bypassSubpathRedirect: boolean;
};

type RoutingResult =
	| {
			type: "next";
	  }
	| {
			type: "rewrite";
			pathname: string;
	  }
	| {
			type: "redirect";
			location: string;
			status: number;
	  };

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

const nextResult = (): RoutingResult => ({ type: "next" });

const rewriteResult = (pathname: string): RoutingResult => ({
	type: "rewrite",
	pathname,
});

const redirectResult = (location: string): RoutingResult => ({
	type: "redirect",
	location,
	status: 308,
});

function isIpAddress(value: string) {
	const host = value.split(":")[0] ?? value;
	const parts = host.split(".");
	if (parts.length === 4) {
		return parts.every((part) => {
			if (!/^\d+$/.test(part)) {
				return false;
			}
			const numericPart = Number(part);
			return numericPart >= 0 && numericPart <= 255;
		});
	}
	return host.includes(":");
}

function shouldHandleRequest(pathname: string) {
	if (pathname === "/sitemap.xml" || pathname === "/robots.txt") {
		return true;
	}

	if (
		pathname.startsWith("/api/") ||
		pathname.startsWith("/_next/") ||
		pathname.startsWith("/_static/") ||
		pathname.startsWith("/_vercel") ||
		pathname.startsWith("/discord/") ||
		pathname.startsWith("/featured-communities/") ||
		pathname.startsWith("/uwu/") ||
		/^\/[\w-]+\.\w+$/.test(pathname)
	) {
		return false;
	}

	return true;
}

export function buildRoutingResult(input: RoutingInput): RoutingResult {
	if (!shouldHandleRequest(input.pathname)) {
		return nextResult();
	}

	const acceptTypes = input.acceptHeader.split(",");
	const plainIndex = acceptTypes.findIndex(
		(type) => type.includes("text/plain") || type.includes("text/markdown"),
	);
	const htmlIndex = acceptTypes.findIndex((type) => type.includes("text/html"));
	const prefersMarkdown =
		plainIndex !== -1 && (htmlIndex === -1 || plainIndex < htmlIndex);

	const mdExtensionMatch = input.pathname.match(/^\/m\/(\d+)\.md$/);
	if (mdExtensionMatch) {
		return rewriteResult(`/m/${mdExtensionMatch[1]}/markdown`);
	}

	if (prefersMarkdown) {
		const messageMatch = input.pathname.match(/^\/m\/(\d+)$/);
		if (messageMatch) {
			return rewriteResult(`/m/${messageMatch[1]}/markdown`);
		}
	}

	if (input.method === "GET" && input.pathname === "/mcp") {
		return rewriteResult("/mcp/setup");
	}

	if (input.pathname.startsWith("/og")) {
		return nextResult();
	}

	if (isOnMainSite(input.host)) {
		return nextResult();
	}

	const localhostSubdomain = extractLocalhostSubdomain(input.host);
	if (localhostSubdomain) {
		const subpathTenant = subpathTenants.find(
			(tenant) => tenant.rewriteDomain === localhostSubdomain,
		);
		if (subpathTenant) {
			const pathnameWithoutSubpath = input.pathname.startsWith(
				`/${subpathTenant.subpath}`,
			)
				? input.pathname.slice(subpathTenant.subpath.length + 1) || "/"
				: input.pathname;
			return rewriteResult(`/${localhostSubdomain}${pathnameWithoutSubpath}`);
		}
		return rewriteResult(`/${localhostSubdomain}${input.pathname}`);
	}

	const parsedAppDomain = parseAnswerOverflowAppDomain(input.host);
	if (parsedAppDomain) {
		const pathnameWithoutSubpath = input.pathname.startsWith(
			`/${parsedAppDomain.subpath}`,
		)
			? input.pathname.slice(parsedAppDomain.subpath.length + 1) || "/"
			: input.pathname;
		return rewriteResult(`/${parsedAppDomain.domain}${pathnameWithoutSubpath}`);
	}

	const subpathTenant = subpathTenants.find((tenant) =>
		input.host.includes(tenant.contentDomain),
	);

	if (subpathTenant && !input.bypassSubpathRedirect) {
		if (!subpathTenant.contentDomain.includes("vapi.ai")) {
			return redirectResult(
				`https://${subpathTenant.rewriteDomain}/${subpathTenant.subpath}${input.pathname}${input.search}`,
			);
		}
	}

	const actualHost = subpathTenant?.rewriteDomain ?? input.host;
	const pathnameWithoutHost = input.pathname.startsWith(`/${actualHost}`)
		? input.pathname.slice(actualHost.length + 1)
		: input.pathname;

	if (!isIpAddress(actualHost)) {
		return rewriteResult(`/${actualHost}${pathnameWithoutHost}`);
	}

	return nextResult();
}

export function buildRoutedRequest(request: Request, result: RoutingResult) {
	if (result.type !== "rewrite") {
		return request;
	}

	const url = new URL(request.url);
	url.pathname = result.pathname;
	return new Request(url, request);
}
