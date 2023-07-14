import type { ServerPublic } from '@answeroverflow/api';
import { AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { Avatar, type AvatarProps, getAvatarSize } from './base';

export interface ServerIconProps extends Omit<AvatarProps, 'url' | 'alt'> {
	server: Pick<ServerPublic, 'id' | 'name' | 'icon'>;
}

export const makeServerIconLink = (
	server: Pick<ServerPublic, 'id' | 'icon'>,
	size: number = 64,
) => {
	if (!server.icon) return undefined;
	return `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png?size=${size}`;
};

export function ServerIcon(props: ServerIconProps) {
	const size = getAvatarSize(props.size ?? 'md');
	const serverIconUrl = makeServerIconLink(props.server, size);
	return (
		<Avatar {...props}>
			<AvatarImage
				src={serverIconUrl}
				width={size}
				height={size}
				alt={props.server.name}
				{...props}
			/>
			<AvatarFallback {...props}>
				{props.server.name.split(' ').map((word) => word.at(0)?.toUpperCase())}
			</AvatarFallback>
		</Avatar>
	);
}
