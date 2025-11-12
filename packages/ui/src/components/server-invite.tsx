import type { Channel, Server } from "@packages/database/convex/schema";
import { cn } from "../lib/utils";
import { LinkButton } from "./link-button";

export interface ServerInviteJoinButtonProps {
	server: Pick<Server, "discordId" | "name" | "icon" | "vanityInviteCode">;
	channel?: Pick<Channel, "id" | "inviteCode">;
	location: string;
	className?: string;
	size?: "default" | "sm" | "lg" | "icon";
}

export function ServerInviteJoinButton(
	props: ServerInviteJoinButtonProps &
		Omit<
			React.ComponentPropsWithoutRef<typeof LinkButton>,
			"href" | "children"
		>,
) {
	const { server, channel, className, ...rest } = props;
	const inviteCode = channel?.inviteCode || server.vanityInviteCode;

	if (!inviteCode) {
		return null;
	}

	return (
		<LinkButton
			href={`https://discord.gg/${inviteCode}`}
			variant="default"
			className={cn("text-center font-bold", className)}
			size={props.size}
			{...rest}
		>
			Join
		</LinkButton>
	);
}

export interface ChannelNameProps {
	channel: Pick<Channel, "name" | "type">;
}

export function ChannelName({ channel }: ChannelNameProps) {
	return (
		<div className="mr-auto flex flex-row items-center justify-start gap-1">
			<span className="text-left font-bold">#</span>
			<p className="grow truncate text-left text-base font-bold leading-5">
				{channel.name}
			</p>
		</div>
	);
}
