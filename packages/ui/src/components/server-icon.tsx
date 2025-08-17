import type { Server } from "@packages/database/convex/schema";
import { cn } from "../lib/utils";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	type AvatarProps,
} from "./avatar";

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("");
}

export interface ServerIconProps extends Omit<AvatarProps, "url" | "alt"> {
	server: Pick<Server, "discordId" | "name" | "icon">;
}

export const makeServerIconLink = (
	server: Pick<Server, "discordId" | "icon">,
	size: number = 64,
) => {
	if (!server.icon) return undefined;
	return `https://cdn.discordapp.com/icons/${server.discordId}/${server.icon}.webp?size=${size}`;
};

export function ServerIcon(props: ServerIconProps) {
	const { className, size = 64, ...rest } = props;
	const serverIconUrl = makeServerIconLink(props.server, size);
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
					"relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-50 text-center dark:bg-neutral-700",
					size > 64 ? "text-4xl" : "text-xl",
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
