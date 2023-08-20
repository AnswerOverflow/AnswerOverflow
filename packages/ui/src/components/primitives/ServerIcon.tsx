import type { ServerPublic } from '@answeroverflow/api';
import { AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { getInitials } from '~ui/utils/avatars';
import { webClientEnv } from '@answeroverflow/env/web';
import { Avatar, AvatarProps } from '~ui/components/primitives/ui/avatar';
import { cn } from '~ui/utils/styling';

export interface ServerIconProps extends Omit<AvatarProps, 'url' | 'alt'> {
	server: Pick<ServerPublic, 'id' | 'name' | 'icon'>;
}

export const makeServerIconLink = (
	server: Pick<ServerPublic, 'id' | 'icon'>,
	size: number = 64,
) => {
	if (webClientEnv.NEXT_PUBLIC_LADLE && !server.icon)
		return `https://api.dicebear.com/6.x/icons/png?size=${size}&seed=${server.id}`;
	if (!server.icon) return undefined;
	return `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png?size=${size}`;
};

export function ServerIcon(props: ServerIconProps) {
	const { className, size = 64, ...rest } = props;
	const serverIconUrl = makeServerIconLink(props.server, size);
	console.log(size);
	return (
		<Avatar
			{...props}
			className={className}
			style={{
				width: size,
				height: size,
			}}
			{...rest}
		>
			<AvatarImage
				src={serverIconUrl}
				width={size}
				height={size}
				alt={props.server.name}
				{...props}
			/>
			<AvatarFallback
				{...props}
				className={cn(
					'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-50 text-center dark:bg-neutral-700',
					size > 64 ? 'text-4xl' : 'text-xl',
					className,
				)}
				style={{
					width: size,
					height: size,
				}}
			>
				{getInitials(props.server.name)}
			</AvatarFallback>
		</Avatar>
	);
}
