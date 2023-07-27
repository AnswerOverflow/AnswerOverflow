import type { DiscordAccountPublic } from '@answeroverflow/api';
import { getInitials } from '~ui/utils/avatars';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarProps
} from "~ui/components/primitives/ui/avatar";

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

export function DiscordAvatar(props: DiscordAvatarProps) {
	const profilePictureUrl = makeUserIconLink(
		props.user,
		props.size ?? 64,
	);
	return (
		<Avatar {...props}>
			<AvatarImage src={profilePictureUrl} alt={props.user.name} {...props} />
			<AvatarFallback {...props}>{getInitials(props.user.name)}</AvatarFallback>
		</Avatar>
	);
}
