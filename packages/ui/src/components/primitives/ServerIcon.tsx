import type { ServerPublic } from '@answeroverflow/api';
import { AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';

import { getInitials } from '~ui/utils/avatars';
import {Avatar, AvatarProps} from "~ui/components/primitives/ui/avatar";

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
  const size = props.size ?? 64;
	const serverIconUrl = makeServerIconLink(props.server, size);
	return (
		<Avatar {...props} className={`w-[${size.toString()}px] h-[${size.toString()}px]`}>
			<AvatarImage
				src={serverIconUrl}
				width={size}
				height={size}
				alt={props.server.name}
				{...props}
			/>
			<AvatarFallback {...props} className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-50 text-center dark:bg-neutral-700 w-[${size.toString()}px] h-[${size.toString()}px]`}>
				{getInitials(props.server.name)}
			</AvatarFallback>
		</Avatar>
	);
}
