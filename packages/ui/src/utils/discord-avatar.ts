export interface DiscordUserForAvatar {
	id: string | bigint;
	name?: string;
	avatar?: string | null;
}

export function makeUserIconLink(
	user: DiscordUserForAvatar,
	size: number = 64,
): string {
	if (user.avatar) {
		return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=${size}`;
	}
	const defaultAvatar = Number(BigInt(user.id.toString()) % 5n).toString();
	return `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
}
