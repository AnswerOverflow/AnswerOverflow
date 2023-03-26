import type { ChannelPublicWithFlags, ServerPublic } from '@answeroverflow/api';
import { createContext } from 'react';
import {
	ChatBubbleLeftRightIcon,
	HashtagIcon,
} from '@heroicons/react/24/outline';
import React from 'react';
import { ChannelType } from '~ui/utils/discord';
import { ServerIcon } from './ServerIcon';
import { useIsUserInServer } from '~ui/utils/hooks';
import { LinkButton } from './base';
import { cn } from '~ui/utils/styling';
import Link from 'next/link';
import { trackEvent } from '@answeroverflow/hooks';
import type { ServerInviteClickProps } from '@answeroverflow/constants/src/analytics';
// eslint-disable-next-line @typescript-eslint/naming-convention
const ServerInviteContext = createContext<{
	server: ServerPublic;
	location: ServerInviteClickProps['Button Location'];
	channel?: ChannelPublicWithFlags;
	isUserInServer: boolean | 'loading';
} | null>(null);

function useServerInviteContext() {
	const context = React.useContext(ServerInviteContext);
	if (!context) {
		throw new Error(
			'useServerInviteContext must be used within a ServerInviteContext',
		);
	}
	return context;
}

export const ServerInviteTitle = () => {
	const { server } = useServerInviteContext();
	return (
		<Link href={`/c/${server.id}`}>
			<h3 className="text-center font-header text-lg font-bold leading-5 text-ao-black  hover:text-ao-black/[.5] dark:text-ao-white dark:hover:text-ao-white/80">
				{server.name}
			</h3>
		</Link>
	);
};

export const ChannelName = ({
	channel,
}: {
	channel: ChannelPublicWithFlags;
}) => {
	const getChannelTypeIcon = (channelType: ChannelType) => {
		switch (channelType) {
			case ChannelType.GuildForum:
				return (
					<ChatBubbleLeftRightIcon className="h-4 w-4 text-ao-black dark:text-ao-white" />
				);
			default:
				return (
					<HashtagIcon className="h-4 w-4 text-ao-black dark:text-ao-white" />
				);
		}
	};

	return (
		<div className="flex w-full flex-row items-center justify-start ">
			{getChannelTypeIcon(channel.type)}
			<h4 className="text-center font-body text-base font-bold leading-5 text-ao-black dark:text-ao-white">
				{channel.name}
			</h4>
		</div>
	);
};

export const ServerInviteJoinButton = (props: { className?: string }) => {
	const { channel, location, server, isUserInServer } =
		useServerInviteContext();
	const inviteCode = channel?.inviteCode;
	if (!inviteCode) return <></>;
	return (
		<LinkButton
			href={`https://discord.gg/${inviteCode}`}
			variant="default"
			referrerPolicy="no-referrer"
			className={cn('text-center font-header font-bold', props.className)}
			onMouseUp={() => {
				trackEvent('Server Invite Click', {
					'Channel Id': channel.id,
					'Channel Name': channel.name,
					'Server Id': channel.serverId,
					'Server Name': server.name,
					'Invite Code': inviteCode,
					'Button Location': location,
				});
			}}
		>
			{isUserInServer !== 'loading' && isUserInServer ? (
				<>Joined</>
			) : (
				<>Join Server</>
			)}
		</LinkButton>
	);
};

export const ServerInviteIcon = () => {
	const { server } = useServerInviteContext();
	return <ServerIcon server={server} size="md" />;
};

type ServerInviteProps = {
	server: ServerPublic;
	channel?: ChannelPublicWithFlags;
	isUserInServer: boolean | 'loading';
	location: ServerInviteClickProps['Button Location'];
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Icon?: React.ReactNode;
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Body?: React.ReactNode;
	// eslint-disable-next-line @typescript-eslint/naming-convention
	JoinButton?: React.ReactNode;
};

export const ServerInviteRenderer = (props: ServerInviteProps) => {
	return (
		<ServerInviteContext.Provider value={props}>
			<div className="flex h-full w-full flex-col items-center justify-center gap-1">
				<div className="flex flex-col">
					<div className="flex flex-row items-center justify-center pb-5 align-middle">
						{props.Icon || <ServerInviteIcon />}
						<div className="flex flex-col items-center justify-center pl-2">
							{props.Body || (
								<>
									<ServerInviteTitle />
									{props.channel && <ChannelName channel={props.channel} />}
								</>
							)}
						</div>
					</div>
					{props.JoinButton || <ServerInviteJoinButton />}
				</div>
			</div>
		</ServerInviteContext.Provider>
	);
};

export const ServerInvite = (
	props: Omit<ServerInviteProps, 'isUserInServer'>,
) => {
	const isUserInServer = useIsUserInServer(props.server.id);
	return <ServerInviteRenderer {...props} isUserInServer={isUserInServer} />;
};
