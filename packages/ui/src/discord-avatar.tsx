'use client';
import { DiscordAccountPublic } from '@answeroverflow/core/zod';
import { AvatarProps } from './ui/avatar';
import { cn } from './utils/utils';
import { useTenant } from './context/tenant-context';
import { makeUserIconLink } from './discord-avatar-utils';

export interface DiscordAvatarProps extends Omit<AvatarProps, 'alt' | 'url'> {
	user: DiscordAccountPublic;
}

export function DiscordAvatar(props: DiscordAvatarProps) {
	const tenant = useTenant();
	const subpath = tenant?.subpath;
	const url = makeUserIconLink(props.user, props.size, subpath);
	const fallback = `${subpath ? `/${subpath}` : ''}/discord/${parseInt(props.user.id) % 5}.png`;
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
