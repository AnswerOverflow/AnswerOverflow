export function constructDiscordLink({
	serverId,
	threadId,
	messageId,
}: {
	serverId: string;
	threadId: string;
	messageId?: string;
}) {
	const parts = [serverId, threadId];

	if (messageId) {
		parts.push(messageId);
	}

	return `https://discord.com/channels/${parts.join("/")}`;
}

export function emojiToTwemoji(emoji: string, version = "14.0.2") {
	function toCodePoint(unicodeSurrogates: string) {
		const r = [];
		let c = 0;
		let p = 0;
		let i = 0;
		while (i < unicodeSurrogates.length) {
			c = unicodeSurrogates.charCodeAt(i++);
			if (p) {
				r.push(
					(0x1_00_00 + ((p - 0xd8_00) << 10) + (c - 0xdc_00)).toString(16),
				);
				p = 0;
			} else if (0xd8_00 <= c && c <= 0xdb_ff) {
				p = c;
			} else {
				r.push(c.toString(16));
			}
		}
		return r.join("-");
	}

	let code = toCodePoint(emoji);

	if (code.substring(0, 2) === "00") {
		code = code.substring(2);
	}

	const regex = /-fe0f/gi;
	code = code.replace(regex, "");

	return `https://cdn.jsdelivr.net/gh/twitter/twemoji@${version}/assets/svg/${code}.svg`;
}

export function isEmbeddableAttachment(a: {
	contentType?: string | null;
	filename: string;
}) {
	return a.contentType?.startsWith("image/") && !a.filename?.endsWith(".svg");
}

export function isVideoAttachment(a: {
	contentType?: string | null;
	filename: string;
}) {
	return a.contentType?.startsWith("video/");
}

export function getDiscordEmojiUrl(emojiId: string, animated = false): string {
	return `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? "gif" : "png"}`;
}
