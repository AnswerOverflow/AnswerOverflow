import { normalizeSubpath } from "./links";

type ServerWithCustomDomain = {
	customDomain?: string;
	subpath?: string;
	discordId: bigint;
};

export function getServerHomepageUrl(server: ServerWithCustomDomain) {
	const subpath = normalizeSubpath(server.subpath);
	if (!server.customDomain) {
		return `/c/${server.discordId}`;
	}
	const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
	const subpathSuffix = subpath ? `/${subpath}` : "";
	return `${protocol}://${server.customDomain}${subpathSuffix}`;
}

export function getServerCustomUrl(
	server: ServerWithCustomDomain,
	path: string = "",
) {
	const subpath = normalizeSubpath(server.subpath);
	if (!server.customDomain) {
		return null;
	}
	const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
	const subpathSuffix = subpath ? `/${subpath}` : "";
	return `${protocol}://${server.customDomain}${subpathSuffix}${path}`;
}
