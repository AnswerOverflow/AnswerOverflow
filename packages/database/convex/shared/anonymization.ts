import {
	adjectives,
	animals,
	colors,
	uniqueNamesGenerator,
} from "unique-names-generator";

export type DiscordAccountPublic = {
	id: string;
	name: string;
	avatar?: string | null;
};

const textEncoder = new TextEncoder();

function encodeHexPrefix(value: string, maxHexLength: number): string {
	return Array.from(textEncoder.encode(value), (byte) =>
		byte.toString(16).padStart(2, "0"),
	)
		.join("")
		.slice(0, maxHexLength);
}

export function anonymizeDiscordAccount(seed: bigint): DiscordAccountPublic {
	const seedStr = seed.toString();
	const shortName: string = uniqueNamesGenerator({
		dictionaries: [adjectives, colors, animals],
		separator: "-",
		length: 2,
		seed: seedStr,
	});

	const randomId = BigInt(`0x${encodeHexPrefix(shortName, 16) || "0"}`);

	return {
		avatar: null,
		name: shortName,
		id: randomId.toString(),
	};
}
