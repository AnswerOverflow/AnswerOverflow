type ServerWithCustomDomain = {
	customDomain?: string;
	subpath?: string;
	discordId: string;
};

export function getServerHomepageUrl(server: ServerWithCustomDomain) {
	if (process.env.NODE_ENV !== "production" && !server.customDomain) {
		return `/c/${server.discordId}`;
	}
	if (!server.customDomain) {
		return `https://www.answeroverflow.com/c/${server.discordId}`;
	}
	const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
	const subpath = server.subpath ? `/${server.subpath}` : "";
	return `${protocol}://${server.customDomain}${subpath}`;
}

export function getServerCustomUrl(
	server: ServerWithCustomDomain,
	path: string = "",
) {
	if (!server.customDomain) {
		return null;
	}
	const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
	const subpath = server.subpath ? `/${server.subpath}` : "";
	return `${protocol}://${server.customDomain}${subpath}${path}`;
}
