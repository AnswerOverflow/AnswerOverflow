import type { DiscordAccount } from "../db/schema";

export interface NewDiscordAccount {
	id: string;
	name: string;
	avatar?: string;
}

export function transformDiscordAccount(
	row: DiscordAccount,
): NewDiscordAccount {
	return {
		id: row.id,
		name: row.name,
		avatar: row.avatar ?? undefined,
	};
}
