import type { IgnoredDiscordAccount } from "../db/schema";

export interface NewIgnoredDiscordAccount {
	id: string;
}

export function transformIgnoredDiscordAccount(
	row: IgnoredDiscordAccount,
): NewIgnoredDiscordAccount {
	return {
		id: row.id,
	};
}
