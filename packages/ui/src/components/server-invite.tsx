"use client";

import type {
	Channel,
	ChannelSettings,
	Server,
} from "@packages/database/convex/schema";
import type { ButtonLocation } from "../analytics/client";
import { trackEvent, usePostHog } from "../analytics/client";
import { cn } from "../lib/utils";
import { LinkButton } from "./link-button";

export interface ServerInviteJoinButtonProps {
	server: Pick<Server, "discordId" | "name" | "icon" | "vanityInviteCode">;
	channel?: Pick<Channel, "id" | "name" | "type"> &
		Pick<ChannelSettings, "inviteCode">;
	location: ButtonLocation;
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
	const inviteCode = server.vanityInviteCode || channel?.inviteCode;
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
					id: server.discordId.toString(),
					name: server.name,
				},
				channel: channel
					? {
							id: channel.id.toString(),
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
