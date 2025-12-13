"use client";

import type {
	Channel,
	ChannelSettings,
	Server,
} from "@packages/database/convex/schema";
import type { ServerInviteClickProps } from "../analytics/client";
import { trackEvent, usePostHog } from "../analytics/client";
import { cn } from "../lib/utils";
import { LinkButton } from "./link-button";

export interface ServerInviteJoinButtonProps {
	server: Pick<Server, "discordId" | "name" | "icon" | "vanityInviteCode">;
	channel?: Pick<Channel, "id" | "name" | "type"> &
		Pick<ChannelSettings, "inviteCode">;
	location: ServerInviteClickProps["Button Location"];
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
	const { server, channel, location, className, ...rest } = props;
	const inviteCode = channel?.inviteCode || server.vanityInviteCode;
	const posthog = usePostHog();

	if (!inviteCode) {
		return null;
	}

	const handleClick = () => {
		trackEvent(
			"Server Invite Click",
			{
				"Button Location": location,
				server: {
					discordId: server.discordId,
					name: server.name,
				},
				channel: channel
					? {
							id: channel.id,
							name: channel.name,
							type: channel.type,
							inviteCode: channel.inviteCode,
						}
					: null,
			},
			posthog,
		);
	};

	return (
		<LinkButton
			href={`https://discord.gg/${inviteCode}`}
			variant="default"
			className={cn("text-center font-bold", className)}
			size={props.size}
			onClick={handleClick}
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
