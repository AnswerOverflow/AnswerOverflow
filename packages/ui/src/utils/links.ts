import { normalizeSubpath } from "./url-builder";

export {
	buildUrl,
	extractLocalhostSubdomain,
	getMainSiteHostname,
	isOnMainSite,
	normalizeSubpath,
	url,
	type UrlTenant,
} from "./url-builder";

export type TenantInfo = {
	customDomain?: string | null;
	subpath?: string | null;
};

/** @deprecated Use `buildUrl(null, path)` or `url.mainSite(path)` instead */
export function getBaseUrl(hostOverride?: string) {
	const siteUrl = process.env.NEXT_PUBLIC_BASE_URL;
	if (siteUrl) {
		return siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
	}
	if (process.env.NODE_ENV === "production") {
		return `https://${hostOverride ?? "www.answeroverflow.com"}`;
	}
	return "http://localhost:3000";
}

/** @deprecated Use `buildUrl(null, path)` or `url.mainSite(path)` instead */
export function makeMainSiteLink(path: string, hostOverride?: string) {
	const base = getBaseUrl(hostOverride);
	return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** @deprecated Use `buildUrl(tenant, path)` or `url.tenant(tenant, path)` instead */
export function getTenantBaseUrl(tenant: TenantInfo | null): string {
	if (!tenant?.customDomain) {
		return getBaseUrl();
	}
	const domain = tenant.customDomain.startsWith("http")
		? tenant.customDomain
		: `https://${tenant.customDomain}`;
	const subpath = normalizeSubpath(tenant.subpath);
	if (subpath) {
		const stripped = domain.endsWith("/") ? domain.slice(0, -1) : domain;
		return `${stripped}/${subpath}`;
	}
	return domain.endsWith("/") ? domain.slice(0, -1) : domain;
}

/** @deprecated Use `buildUrl(tenant, path)` or `url.tenant(tenant, path)` instead */
export function getTenantUrl(tenant: TenantInfo | null, path: string): string {
	const { buildUrl } = require("./url-builder");
	return buildUrl(tenant, path);
}

/** @deprecated Use `buildUrl(tenant, path, { type: 'canonical' })` or `url.canonical(tenant, path)` instead */
export function getTenantCanonicalUrl(
	tenant: TenantInfo | null,
	path: string,
): string {
	const { buildUrl } = require("./url-builder");
	return buildUrl(tenant, path, { type: "canonical" });
}

/** @deprecated Use `!isOnMainSite(host)` instead */
export function isLocalDev(): boolean {
	return process.env.NODE_ENV !== "production";
}
