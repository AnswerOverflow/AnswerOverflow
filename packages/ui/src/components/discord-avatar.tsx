"use client";

import { cn } from "../lib/utils";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	type AvatarProps,
} from "./avatar";

export interface DiscordUser {
	id: string;
	name: string;
	avatar?: string;
}

export interface DiscordAvatarProps extends Omit<AvatarProps, "url" | "alt"> {
	user: DiscordUser;
	size?: number;
}

export function makeUserIconLink(user: DiscordUser, size: number = 64): string {
	if (user.avatar) {
		return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=${size}`;
	}
	const defaultAvatar = Number(BigInt(user.id) % 5n).toString();
	return `/discord/${defaultAvatar}.png`;
}

export function DiscordAvatar(props: DiscordAvatarProps) {
	const { className, size = 64, user, ...rest } = props;
	const avatarUrl = makeUserIconLink(user, size);

	return (
		<Avatar
			className={className}
			style={{
				width: size,
				height: size,
			}}
			{...rest}
		>
			<AvatarImage src={avatarUrl} width={size} height={size} alt={user.name} />
			<AvatarFallback
				className={cn(
					"relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-50 text-center dark:bg-neutral-700",
					size > 64 ? "text-4xl" : "text-xl",
					className,
				)}
				style={{
					width: size,
					height: size,
				}}
			>
				{user.name.charAt(0).toUpperCase()}
			</AvatarFallback>
		</Avatar>
	);
}
