const stripTrailingSlash = (value: string) => {
	return value.endsWith("/") ? value.slice(0, -1) : value;
};

export function getBaseUrl(hostOverride?: string) {
	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
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
		normalizedHost?.endsWith(".vercel.app")
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
