import { DiscordAccountPublic } from '@answeroverflow/prisma-types';
import {
	uniqueNamesGenerator,
	adjectives,
	colors,
	animals,
} from 'unique-names-generator';

export function anonymizeDiscordAccount(
	account: DiscordAccountPublic,
	seed: string,
): DiscordAccountPublic {
	const shortName: string = uniqueNamesGenerator({
		dictionaries: [adjectives, colors, animals],
		separator: '-',
		length: 2,
		seed,
	});
	return {
		avatar: null,
		name: shortName,
		id: seed,
	};
}
