import type { DiscordAccountPublic } from '@answeroverflow/api';
import { Avatar, AvatarProps, getAvatarSize } from './primitives/Avatar';

export interface DiscordAvatarProps extends Omit<AvatarProps, 'alt' | 'url'> {
	user: DiscordAccountPublic;
}

const makeUserIconLink = (
	user: Pick<DiscordAccountPublic, 'id' | 'avatar'>,
	size: number = 64,
) => {
	if (user.avatar)
		return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;
	return `https://cdn.discordapp.com/embed/avatars/${
		parseInt(user.id) % 5
	}.png?size=${size}`;
};

export function DiscordAvatar({
	user,
	size = 'md',
	...props
}: DiscordAvatarProps) {
	const profilePictureUrl = makeUserIconLink(user, getAvatarSize(size));
	return (
		<Avatar alt={user.name} size={size} url={profilePictureUrl} {...props} />
	);
}
