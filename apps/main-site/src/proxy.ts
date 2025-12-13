import { isIP } from "node:net";
import { isOnMainSite, normalizeSubpath } from "@packages/ui/utils/links";
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
	const { pathname } = url;
	const host = request.headers.get("host") ?? "";
	const normalizedHost = host.split(":")[0];

	if (pathname.startsWith("/og") || pathname.startsWith("/ingest")) {
		return NextResponse.next();
	}

	const subpathTenant = subpathTenants.find((tenant) =>
		normalizedHost?.includes(tenant.contentDomain),
	);

	if (subpathTenant) {
		const redirect = new URL(
			`https://${subpathTenant.rewriteDomain}/${subpathTenant.subpath}${pathname}${url.search}`,
			request.url,
		);
		return NextResponse.redirect(redirect, 308);
	}

	const subpathRewriteTenant = subpathTenants.find(
		(tenant) => normalizedHost === tenant.rewriteDomain,
	);

	if (subpathRewriteTenant) {
		const tenantSubpath = normalizeSubpath(subpathRewriteTenant.subpath);
		if (
			tenantSubpath &&
			(pathname === `/${tenantSubpath}` ||
				pathname.startsWith(`/${tenantSubpath}/`))
		) {
			const rewrittenPath = pathname.replace(`/${tenantSubpath}`, "") || "/";
			const rewritten = new URL(
				`/${subpathRewriteTenant.rewriteDomain}${rewrittenPath}${url.search}`,
				request.url,
			);
			return NextResponse.rewrite(rewritten);
		}
	}

	if (!isOnMainSite(normalizedHost) && isIP(normalizedHost ?? "") === 0) {
		const rewritten = new URL(
			`/${normalizedHost}${pathname}${url.search}`,
			request.url,
		);
		return NextResponse.rewrite(rewritten);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
