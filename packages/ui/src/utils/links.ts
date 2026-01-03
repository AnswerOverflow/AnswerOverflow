import { parse } from "tldts";

const stripTrailingSlash = (value: string) => {
	return value.endsWith("/") ? value.slice(0, -1) : value;
};

export type ParsedAnswerOverflowAppDomain = {
	domain: string;
	subpath: string;
};

export function parseAnswerOverflowAppDomain(
	host: string,
): ParsedAnswerOverflowAppDomain | null {
	const hostWithoutPort = host.split(":")[0];
	if (!hostWithoutPort) return null;

	const parsed = parse(hostWithoutPort);

	if (parsed.domain !== "answeroverflow.app" || !parsed.subdomain) {
		return null;
	}

	const lastDashIndex = parsed.subdomain.lastIndexOf("-");
	if (lastDashIndex === -1) {
		return null;
	}

	const domain = parsed.subdomain.slice(0, lastDashIndex);
	const subpath = parsed.subdomain.slice(lastDashIndex + 1);

	if (!domain || !subpath) {
		return null;
	}

	return { domain, subpath };
}

export function getBaseUrl(hostOverride?: string) {
	const siteUrl = process.env.NEXT_PUBLIC_BASE_URL;
	if (siteUrl) {
		return stripTrailingSlash(siteUrl);
	}

	if (process.env.NODE_ENV === "production") {
		return `https://${hostOverride ?? "www.answeroverflow.com"}`;
	}

	return "http://localhost:3000";
}

export function getMainSiteHostname() {
	return new URL(getBaseUrl()).host;
}

export function extractLocalhostSubdomain(
	host: string | null | undefined,
): string | null {
	if (!host) return null;
	const hostWithoutPort = host.split(":")[0];
	if (!hostWithoutPort) return null;
	if (
		hostWithoutPort === "localhost" ||
		!hostWithoutPort.endsWith(".localhost")
	) {
		return null;
	}
	const subdomain = hostWithoutPort.slice(0, -".localhost".length);
	return subdomain.length > 0 ? subdomain : null;
}

export function isOnMainSite(host: string | null | undefined) {
	if (!host) return false;
	const normalizedHost = host.split(":")[0];
	const mainHost = getMainSiteHostname().split(":")[0];
	const bareMainHost = mainHost?.startsWith("www.")
		? mainHost?.slice(4)
		: mainHost;

	if (normalizedHost?.endsWith(".localhost")) {
		return false;
	}

	return (
		normalizedHost === mainHost ||
		normalizedHost === bareMainHost ||
		normalizedHost === "localhost" ||
		normalizedHost === "127.0.0.1" ||
		normalizedHost === "ao.tail5665af.ts.net" ||
		normalizedHost?.endsWith(".vercel.app") ||
		normalizedHost?.includes("ngrok-free.app") ||
		normalizedHost === "new.answeroverflow.com"
	);
}

export function makeMainSiteLink(path: string, hostOverride?: string) {
	const base = getBaseUrl(hostOverride);
	return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function normalizeSubpath(subpath?: string | null) {
	if (!subpath) return null;
	const trimmed = subpath.trim().replace(/^\/+/, "").replace(/\/+$/, "");
	return trimmed.length > 0 ? trimmed : null;
}

export type TenantInfo = {
	customDomain?: string | null;
	subpath?: string | null;
};

export function getTenantBaseUrl(tenant: TenantInfo | null): string {
	if (!tenant) {
		return getBaseUrl();
	}

	if (tenant.customDomain) {
		const domain = tenant.customDomain.startsWith("http")
			? tenant.customDomain
			: `https://${tenant.customDomain}`;
		const subpath = normalizeSubpath(tenant.subpath);
		return subpath
			? `${stripTrailingSlash(domain)}/${subpath}`
			: stripTrailingSlash(domain);
	}

	return getBaseUrl();
}

const subpathLookup: Record<string, string> = {
	"community.migaku.com": "migaku.com/community",
	"testing.rhys.ltd": "rhys.ltd/idk",
	"discord.vapi.ai": "vapi.ai/community",
};

export function isLocalDev(): boolean {
	return process.env.NODE_ENV !== "production";
}

export function getTenantUrl(tenant: TenantInfo | null, path: string): string {
	if (!tenant?.customDomain) {
		const normalizedPath = path.startsWith("/") ? path : `/${path}`;
		return `${getBaseUrl()}${normalizedPath}`;
	}

	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	const isApiPath = normalizedPath.startsWith("/api/");
	const subpathTenant = subpathLookup[tenant.customDomain];

	if (isLocalDev()) {
		const subpath = subpathTenant?.split("/")[1];
		const pathWithSubpath =
			subpath && !isApiPath ? `/${subpath}${normalizedPath}` : normalizedPath;
		return `http://${tenant.customDomain}.localhost:3000${pathWithSubpath}`;
	}

	if (subpathTenant) {
		return `https://${subpathTenant}${normalizedPath}`;
	}

	const subpath = normalizeSubpath(tenant.subpath);
	const pathWithSubpath =
		subpath && !isApiPath ? `/${subpath}${normalizedPath}` : normalizedPath;
	return `https://${tenant.customDomain}${pathWithSubpath}`;
}

export function getTenantCanonicalUrl(
	tenant: TenantInfo | null,
	path: string,
): string {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;

	if (subpathLookup[tenant?.customDomain ?? ""]) {
		return `https://${subpathLookup[tenant?.customDomain ?? ""]}${normalizedPath}`;
	}

	const baseUrl = getTenantBaseUrl(tenant);
	return `${baseUrl}${normalizedPath}`;
}
