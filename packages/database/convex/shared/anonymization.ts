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

export function anonymizeDiscordAccount(seed: bigint): DiscordAccountPublic {
	const seedStr = seed.toString();
	const shortName: string = uniqueNamesGenerator({
		dictionaries: [adjectives, colors, animals],
		separator: "-",
		length: 2,
		seed: seedStr,
	});

	const randomId = BigInt(
		"0x" + Buffer.from(shortName).toString("hex").slice(0, 16),
	);

	return {
		avatar: null,
		name: shortName,
		id: randomId.toString(),
	};
}
