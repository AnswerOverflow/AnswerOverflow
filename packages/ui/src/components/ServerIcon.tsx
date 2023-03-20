import type { ServerPublic } from '@answeroverflow/api';
import { AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { Avatar, AvatarProps, getAvatarSize } from './primitives/Avatar';

export interface ServerIconProps extends Omit<AvatarProps, 'url' | 'alt'> {
	server: ServerPublic;
}

export const makeServerIconLink = (server: ServerPublic, size: number = 64) => {
	if (!server.icon) return undefined;
	return `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png?size=${size}`;
};

export function ServerIcon(props: ServerIconProps) {
	const serverIconUrl = makeServerIconLink(
		props.server,
		getAvatarSize(props.size ?? 'md'),
	);
	return (
		<Avatar {...props}>
			<AvatarImage src={serverIconUrl} alt={props.server.name} {...props} />
			<AvatarFallback {...props}>
				{props.server.name.split(' ').map((word) => word.at(0)?.toUpperCase())}
			</AvatarFallback>
		</Avatar>
	);
}
