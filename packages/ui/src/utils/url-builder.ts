export type UrlTenant = {
	customDomain?: string | null;
	subpath?: string | null;
} | null;

type UrlOptions = {
	type?: "canonical" | "clickable";
};

const MAIN_SITE_DOMAIN = "www.answeroverflow.com";
const PREVIEW_SUFFIX = "answeroverflow.dev";

function getBaseUrl(): string {
	const envUrl = process.env.NEXT_PUBLIC_BASE_URL;
	if (envUrl) {
		return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
	}
	if (process.env.NODE_ENV === "production") {
		return `https://${MAIN_SITE_DOMAIN}`;
	}
	return "http://localhost:3000";
}

function isLocal(): boolean {
	return process.env.NODE_ENV !== "production";
}

function isPreview(): boolean {
	const baseUrl = getBaseUrl();
	return baseUrl.includes(PREVIEW_SUFFIX);
}

function normalizePath(path: string): string {
	if (!path) return "/";
	return path.startsWith("/") ? path : `/${path}`;
}

export function normalizeSubpath(subpath?: string | null): string | null {
	if (!subpath) return null;
	const trimmed = subpath.trim().replace(/^\/+/, "").replace(/\/+$/, "");
	return trimmed.length > 0 ? trimmed : null;
}

function slugifyDomain(domain: string): string {
	return domain.replace(/\./g, "-");
}

export function buildUrl(
	tenant: UrlTenant,
	path: string,
	options: UrlOptions = {},
): string {
	const { type = "clickable" } = options;
	const normalizedPath = normalizePath(path);
	const subpath = normalizeSubpath(tenant?.subpath);
	const isApiPath = normalizedPath.startsWith("/api/");

	if (!tenant?.customDomain) {
		if (type === "canonical") {
			return `https://${MAIN_SITE_DOMAIN}${normalizedPath}`;
		}
		return `${getBaseUrl()}${normalizedPath}`;
	}

	if (type === "canonical") {
		const pathWithSubpath =
			subpath && !isApiPath ? `/${subpath}${normalizedPath}` : normalizedPath;
		return `https://${tenant.customDomain}${pathWithSubpath}`;
	}

	if (isLocal()) {
		const pathWithSubpath =
			subpath && !isApiPath ? `/${subpath}${normalizedPath}` : normalizedPath;
		return `http://${tenant.customDomain}.localhost:3000${pathWithSubpath}`;
	}

	if (isPreview()) {
		const slug = subpath
			? `${subpath}.${slugifyDomain(tenant.customDomain)}`
			: slugifyDomain(tenant.customDomain);
		return `https://${slug}---${PREVIEW_SUFFIX}${normalizedPath}`;
	}

	const pathWithSubpath =
		subpath && !isApiPath ? `/${subpath}${normalizedPath}` : normalizedPath;
	return `https://${tenant.customDomain}${pathWithSubpath}`;
}

export const url = {
	mainSite: (path: string) => buildUrl(null, path),
	tenant: (tenant: UrlTenant, path: string) => buildUrl(tenant, path),
	canonical: (tenant: UrlTenant, path: string) =>
		buildUrl(tenant, path, { type: "canonical" }),
};

export function getMainSiteHostname(): string {
	return new URL(getBaseUrl()).host;
}

export function isOnMainSite(host: string | null | undefined): boolean {
	if (!host) return false;
	const normalizedHost = host.split(":")[0];
	const mainHost = getMainSiteHostname().split(":")[0];
	const bareMainHost = mainHost?.startsWith("www.")
		? mainHost?.slice(4)
		: mainHost;

	if (normalizedHost?.endsWith(".localhost")) {
		return false;
	}

	if (normalizedHost?.includes("---")) {
		return false;
	}

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
	return hostWithoutPort.slice(0, -".localhost".length) || null;
}

type ServerWithCustomDomain = {
	customDomain?: string | null;
	subpath?: string | null;
	discordId: bigint;
};

export function getServerHomepageUrl(server: ServerWithCustomDomain): string {
	if (!server.customDomain) {
		return `/c/${server.discordId}`;
	}
	return buildUrl(
		{ customDomain: server.customDomain, subpath: server.subpath },
		"/",
	);
}

export function getServerCustomUrl(
	server: ServerWithCustomDomain,
	path: string = "",
): string | null {
	if (!server.customDomain) {
		return null;
	}
	return buildUrl(
		{ customDomain: server.customDomain, subpath: server.subpath },
		path,
	);
}
