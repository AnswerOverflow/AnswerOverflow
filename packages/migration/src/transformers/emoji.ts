import type { Emoji } from "../db/schema";

export interface NewEmoji {
	id: string;
	name: string;
}

export function transformEmoji(row: Emoji): NewEmoji {
	return {
		id: row.id,
		name: row.name,
	};
}
