import { isLocalDev, normalizeSubpath } from "./links";

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
	if (isLocalDev()) {
		const subpathSuffix = subpath ? `/${subpath}` : "";
		return `http://${server.customDomain}.localhost:3000${subpathSuffix}`;
	}
	const subpathSuffix = subpath ? `/${subpath}` : "";
	return `https://${server.customDomain}${subpathSuffix}`;
}

export function getServerCustomUrl(
	server: ServerWithCustomDomain,
	path: string = "",
) {
	const subpath = normalizeSubpath(server.subpath);
	if (!server.customDomain) {
		return null;
	}
	if (isLocalDev()) {
		const subpathSuffix = subpath ? `/${subpath}` : "";
		return `http://${server.customDomain}.localhost:3000${subpathSuffix}${path}`;
	}
	const subpathSuffix = subpath ? `/${subpath}` : "";
	return `https://${server.customDomain}${subpathSuffix}${path}`;
}
