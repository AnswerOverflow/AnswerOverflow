import { DiscordAccount } from '../schema';

export function getDefaultDiscordAccount(
	override: Partial<DiscordAccount> & { id: string; name: string },
): DiscordAccount {
	const data: DiscordAccount = {
		avatar: null,
		...override,
	};
	return data;
}
