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
	return {
		avatar: null,
		name: shortName,
		id: seedStr,
	};
}
