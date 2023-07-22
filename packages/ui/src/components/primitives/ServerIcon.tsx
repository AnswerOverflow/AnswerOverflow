import type { ServerPublic } from '@answeroverflow/api';
import { AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { Avatar, type AvatarProps, getAvatarSize } from './base';
import { getInitials } from '~ui/utils/avatars';
import { webClientEnv } from '@answeroverflow/env/web';

export interface ServerIconProps extends Omit<AvatarProps, 'url' | 'alt'> {
	server: Pick<ServerPublic, 'id' | 'name' | 'icon'>;
}

export const makeServerIconLink = (
	server: Pick<ServerPublic, 'id' | 'icon'>,
	size: number = 64,
) => {
	if (webClientEnv.NEXT_PUBLIC_LADLE)
		return `https://api.dicebear.com/6.x/icons/png?size=${size}&seed=${server.id}`;
	if (!server.icon) return undefined;
	return `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png?size=${size}`;
};

export function ServerIcon(props: ServerIconProps) {
	const size = getAvatarSize(props.size ?? 'md');
	const serverIconUrl = makeServerIconLink(props.server, size);
	console.log(size);
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
				{getInitials(props.server.name)}
			</AvatarFallback>
		</Avatar>
	);
}
