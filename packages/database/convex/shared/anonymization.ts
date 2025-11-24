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

export function anonymizeDiscordAccount(
	_account: DiscordAccountPublic,
	seed: string,
): DiscordAccountPublic {
	const shortName: string = uniqueNamesGenerator({
		dictionaries: [adjectives, colors, animals],
		separator: "-",
		length: 2,
		seed,
	});
	return {
		avatar: null,
		name: shortName,
		id: seed,
	};
}
