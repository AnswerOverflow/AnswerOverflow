const DISCORD_CDN_HOSTS = new Set([
	"cdn.discordapp.com",
	"media.discordapp.net",
]);

export function cdnUrlForAttachment(
	id: bigint | string,
	filename: string,
	cdnDomain: string,
): string {
	return `https://${cdnDomain}/${id}/${filename}`;
}

export function parseDiscordAttachmentUrl(
	url: string,
): { id: string; filename: string } | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}

	if (!DISCORD_CDN_HOSTS.has(parsed.hostname)) {
		return null;
	}

	const segments = parsed.pathname.split("/").filter(Boolean);
	if (segments[0] !== "attachments" || segments.length < 4) {
		return null;
	}

	const id = segments[2];
	const encodedFilename = segments[3];
	if (!id || !encodedFilename) {
		return null;
	}

	let filename: string;
	try {
		filename = decodeURIComponent(encodedFilename);
	} catch {
		filename = encodedFilename;
	}

	return { id, filename };
}

export function rewriteDiscordMediaUrlToCdn(
	url: string,
	cdnDomain: string,
): string {
	const parsed = parseDiscordAttachmentUrl(url);
	if (!parsed) {
		return url;
	}
	return cdnUrlForAttachment(parsed.id, parsed.filename, cdnDomain);
}
