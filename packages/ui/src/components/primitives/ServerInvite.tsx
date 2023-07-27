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
import { classNames, cn } from '~ui/utils/styling';
import Link from 'next/link';
import { trackEvent } from '@answeroverflow/hooks';
import {
	type ServerInviteClickProps,
	channelToAnalyticsData,
	serverToAnalyticsData,
} from '@answeroverflow/constants/src/analytics';
import { getServerHomepageUrl } from '~ui/utils/server';
// eslint-disable-next-line @typescript-eslint/naming-convention
const ServerInviteContext = createContext<{
	server: ServerPublic;
	location: ServerInviteClickProps['Button Location'];
	channel?: ChannelPublicWithFlags;
	isUserInServer: ReturnType<typeof useIsUserInServer>;
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
	const { server, location, channel } = useServerInviteContext();
	return (
		<Link
			href={getServerHomepageUrl(server)}
			onMouseUp={() => {
				trackEvent('Community Page Link Click', {
					'Link Location': location,
					...serverToAnalyticsData(server),
					...(channel && channelToAnalyticsData(channel)),
				});
			}}
			className="hover:text-primary/70 text-left font-header  text-lg font-bold hover:underline"
		>
			{server.name}
		</Link>
	);
};

export const ChannelIcon = ({
	channelType,
	className,
}: {
	channelType: ChannelType;
	className?: string;
}) => {
	switch (channelType) {
		case ChannelType.GuildForum:
			return (
				<ChatBubbleLeftRightIcon
					className={classNames('h-4 w-4', className ?? '')}
				/>
			);
		default:
			return <HashtagIcon className={classNames('h-4 w-4', className ?? '')} />;
	}
};

// TODO: Make this more styleable
export const ChannelName = ({
	channel,
}: {
	channel: ChannelPublicWithFlags;
}) => {
	return (
		<div className="flex w-full flex-row items-center">
			<ChannelIcon
				channelType={channel.type}
				className={'text-right font-bold'}
			/>
			<p className="truncate text-left text-base font-bold leading-5">
				{channel.name}
			</p>
		</div>
	);
};

export const ServerInviteJoinButton = (props: { className?: string }) => {
	const { channel, location, server, isUserInServer } =
		useServerInviteContext();
	const inviteCode = channel?.inviteCode || server.vanityInviteCode;
	if (!inviteCode) return <></>;
	return (
		<LinkButton
			href={`https://discord.gg/${inviteCode}`}
			variant="default"
			referrerPolicy="no-referrer"
			className={cn('text-center font-header font-bold', props.className)}
			onMouseUp={() => {
				trackEvent('Server Invite Click', {
					...(channel && channelToAnalyticsData(channel)),
					...serverToAnalyticsData(server),
					'Button Location': location,
				});
			}}
		>
			{isUserInServer === 'in_server' ? <>Joined</> : <>Join Server</>}
		</LinkButton>
	);
};

export const ServerInviteIcon = () => {
	const { server } = useServerInviteContext();
	return <ServerIcon server={server} size={48} className={'shrink-0'} />;
};

type ServerInviteProps = {
	server: ServerPublic;
	channel?: ChannelPublicWithFlags;
	isUserInServer: ReturnType<typeof useIsUserInServer>;
	location: ServerInviteClickProps['Button Location'];
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Icon?: React.ReactNode;
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Body?: React.ReactNode;
	// eslint-disable-next-line @typescript-eslint/naming-convention
	JoinButton?: React.ReactNode;
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Title?: React.ReactNode;
	maxWidth?: string;
	truncate?: boolean;
};

export const ServerInviteRenderer = (props: ServerInviteProps) => {
	const { truncate = true } = props;
	return (
		<ServerInviteContext.Provider value={props}>
			<div
				className={classNames(
					'flex w-full flex-col gap-4',
					props.maxWidth ?? 'max-w-sm',
				)}
			>
				<div className={'flex flex-row gap-4'}>
					<div className="flex max-w-full shrink-0 flex-row items-center justify-start gap-4 align-middle">
						{props.Icon === undefined ? <ServerInviteIcon /> : props.Icon}
					</div>
					<div
						className={classNames(
							'grow items-center justify-center text-left',
							truncate ? 'truncate' : '',
						)}
					>
						{props.Title === undefined ? <ServerInviteTitle /> : props.Title}
						{props.Body || (
							<>{props.channel && <ChannelName channel={props.channel} />}</>
						)}
					</div>
				</div>
				{props.JoinButton || <ServerInviteJoinButton />}
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
