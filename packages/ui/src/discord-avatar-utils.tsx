import type { DiscordAccountPublic } from '@answeroverflow/core/zod';

export const makeUserIconLink = (
	user: Pick<DiscordAccountPublic, 'id' | 'avatar'>,
	size: number = 64,
	subpath: string | null | undefined,
) => {
	if (user.avatar)
		return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=${size}`;
	return `${subpath ? `/${subpath}` : ''}/discord/${parseInt(user.id) % 5}.png`;
};
