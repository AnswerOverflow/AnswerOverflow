const stripTrailingSlash = (value: string) => {
	return value.endsWith("/") ? value.slice(0, -1) : value;
};

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

export function isOnMainSite(host: string | null | undefined) {
	if (!host) return false;
	const normalizedHost = host.split(":")[0];
	const mainHost = getMainSiteHostname().split(":")[0];
	const bareMainHost = mainHost?.startsWith("www.")
		? mainHost?.slice(4)
		: mainHost;
	return (
		normalizedHost === mainHost ||
		normalizedHost === bareMainHost ||
		normalizedHost === "localhost" ||
		normalizedHost === "127.0.0.1" ||
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

export function getTenantCanonicalUrl(
	tenant: TenantInfo | null,
	path: string,
): string {
	if (subpathLookup[tenant?.customDomain ?? ""]) {
		const normalizedPath = path.startsWith("/") ? path : `/${path}`;
		// todo make this more general
		const http = tenant?.customDomain === "tenant:3000" ? "http" : "https";
		return `${http}://${subpathLookup[tenant?.customDomain ?? ""]}${normalizedPath}`;
	}
	const baseUrl = getTenantBaseUrl(tenant);
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${baseUrl}${normalizedPath}`;
}
