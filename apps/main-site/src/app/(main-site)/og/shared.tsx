import { readFile } from "node:fs/promises";
import { join } from "node:path";

const fontDir = join(process.cwd(), "src/styles");
const satoshiBlackPromise = readFile(join(fontDir, "Satoshi-Black.ttf"));
const satoshiBoldPromise = readFile(join(fontDir, "Satoshi-Bold.ttf"));

export async function loadOgFonts() {
	const [satoshiBlack, satoshiBold] = await Promise.all([
		satoshiBlackPromise,
		satoshiBoldPromise,
	]);
	return { satoshiBlack, satoshiBold };
}

export function getOgFontConfig(fonts: {
	satoshiBlack: Buffer;
	satoshiBold: Buffer;
}) {
	return [
		{ name: "Satoshi Black", data: fonts.satoshiBlack },
		{ name: "Satoshi Bold", data: fonts.satoshiBold },
	];
}

export function truncate(str: string, n = 30) {
	const truncated = str.length > n ? `${str.slice(0, n - 1)}...` : str;
	return truncated.replace(/[^\p{L}\d\s-]+/gu, "");
}

export async function validateImageUrl(
	url: string | undefined,
): Promise<boolean> {
	if (!url) return false;
	try {
		const response = await fetch(url, { method: "HEAD" });
		return response.ok;
	} catch {
		return false;
	}
}

export function formatNumber(num: number): string {
	if (num >= 1000000) {
		return `${(num / 1000000).toFixed(1)}M`;
	}
	if (num >= 1000) {
		return `${(num / 1000).toFixed(1)}K`;
	}
	return num.toString();
}

export function makeServerIconLink(
	server: { discordId: bigint; icon?: string | null },
	size = 64,
) {
	if (!server.icon) return undefined;
	return `https://cdn.discordapp.com/icons/${server.discordId}/${server.icon}.png?size=${size}`;
}

export const CalendarIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="48"
		height="48"
		viewBox="0 0 24 24"
		opacity="0.8"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
		<line x1="16" x2="16" y1="2" y2="6" />
		<line x1="8" x2="8" y1="2" y2="6" />
		<line x1="3" x2="21" y1="10" y2="10" />
		<path d="M8 14h.01" />
		<path d="M12 14h.01" />
		<path d="M16 14h.01" />
		<path d="M8 18h.01" />
		<path d="M12 18h.01" />
		<path d="M16 18h.01" />
	</svg>
);

export const CalendarIconSmall = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="36"
		height="36"
		viewBox="0 0 24 24"
		opacity="0.8"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
		<line x1="16" x2="16" y1="2" y2="6" />
		<line x1="8" x2="8" y1="2" y2="6" />
		<line x1="3" x2="21" y1="10" y2="10" />
		<path d="M8 14h.01" />
		<path d="M12 14h.01" />
		<path d="M16 14h.01" />
		<path d="M8 18h.01" />
		<path d="M12 18h.01" />
		<path d="M16 18h.01" />
	</svg>
);
