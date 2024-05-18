import type { DiscordAccountPublic } from '@answeroverflow/db';
import { AvatarProps } from './ui/avatar';
import { cn } from './utils/utils';

export interface DiscordAvatarProps extends Omit<AvatarProps, 'alt' | 'url'> {
	user: DiscordAccountPublic;
}

const makeUserIconLink = (
	user: Pick<DiscordAccountPublic, 'id' | 'avatar'>,
	size: number = 64,
) => {
	if (user.avatar)
		return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=${size}`;
	return `/discord/${parseInt(user.id) % 5}.png`;
};

export function DiscordAvatar(props: DiscordAvatarProps) {
	const url = makeUserIconLink(props.user, props.size);
	const fallback = `/discord/${parseInt(props.user.id) % 5}.png`;
	return (
		<div
			style={{
				height: props.size,
				width: props.size,
			}}
		>
			<object
				type="image/png"
				data={url}
				aria-label={props.user.name}
				className={cn(
					`aspect-square h-full w-full rounded-full`,
					props.className,
				)}
			>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={fallback}
					alt={props.user.name}
					width={props.size}
					height={props.size}
					className={cn(
						'aspect-square h-full w-full rounded-full',
						props.className,
					)}
				/>
			</object>
		</div>
	);
}
