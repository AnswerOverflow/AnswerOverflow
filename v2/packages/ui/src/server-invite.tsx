import type { ServerPublic } from '@answeroverflow/api';
import type { ChannelPublicWithFlags } from '@answeroverflow/db';
import {
	ChatBubbleLeftRightIcon,
	HashtagIcon,
} from '@heroicons/react/24/outline';
import React from 'react';
import { ChannelType } from './utils/discord';
import { ServerIcon } from './server-icon';
import { classNames, cn } from './utils/utils';
import {
	type ServerInviteClickProps,
	channelToAnalyticsData,
	serverToAnalyticsData,
} from '@answeroverflow/constants/src/analytics';
import { getServerHomepageUrl } from './utils/server';
import { ButtonProps } from './ui/button';
import { TrackLink } from './ui/track-link';
import { TrackLinkButton } from './ui/track-link-button';

import { ServerInviteJoinText } from './server-invite.client';
import { LinkButton } from './ui/link-button';

type ServerInviteProps = {
	server: ServerPublic;
	channel?: ChannelPublicWithFlags;
	location: ServerInviteClickProps['Button Location'];
	maxWidth?: string;
	truncate?: boolean;
};

export const ServerInviteTitle = (
	props: Pick<ServerInviteProps, 'server' | 'channel' | 'location'>,
) => {
	return (
		<TrackLink
			href={getServerHomepageUrl(props.server)}
			eventName={'Community Page Link Click'}
			eventData={{
				'Link Location': props.location,
				...serverToAnalyticsData(props.server),
				...(props.channel && channelToAnalyticsData(props.channel)),
			}}
			className="text-left font-header text-lg font-bold hover:text-primary/75 hover:underline"
		>
			{props.server.name}
		</TrackLink>
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
		<div className="mr-auto flex flex-row items-center justify-start gap-1">
			<ChannelIcon
				channelType={channel.type}
				className={'text-left font-bold'}
			/>
			<p className="grow truncate text-left text-base font-bold leading-5">
				{channel.name}
			</p>
		</div>
	);
};

export const ServerInviteJoinButton = (
	props: {
		className?: string;
		size?: ButtonProps['size'];
	} & Pick<ServerInviteProps, 'server' | 'channel' | 'location'> &
		Omit<React.ComponentPropsWithoutRef<typeof LinkButton>, 'href'>,
) => {
	const { server, channel, location, className, ...rest } = props;
	const inviteCode = channel?.inviteCode || server.vanityInviteCode;
	if (!inviteCode) return <></>;
	return (
		<TrackLinkButton
			href={`https://discord.gg/${inviteCode}`}
			variant="default"
			className={cn('text-center font-header font-bold', className)}
			size={props.size}
			eventName={'Server Invite Click'}
			eventData={{
				...(channel && channelToAnalyticsData(channel)),
				...serverToAnalyticsData(server),
				'Button Location': location,
			}}
			{...rest}
		>
			<ServerInviteJoinText id={server.id} />
		</TrackLinkButton>
	);
};

export const ServerInvite = (
	props: ServerInviteProps & {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		JoinButton?: React.ReactNode;
	},
) => {
	const { truncate = true } = props;
	return (
		<div
			className={classNames(
				'flex w-full flex-col gap-4',
				props.maxWidth ?? 'max-w-sm',
			)}
		>
			<div className={'flex flex-row gap-4'}>
				<div className="flex max-w-full shrink-0 flex-row items-center justify-start gap-4 align-middle">
					<ServerIcon server={props.server} size={48} className={'shrink-0'} />
				</div>
				<div
					className={classNames(
						'grow items-center justify-center text-left',
						truncate ? 'truncate' : '',
					)}
				>
					<ServerInviteTitle {...props} />
					{props.channel && <ChannelName channel={props.channel} />}
				</div>
			</div>
			{props.JoinButton !== undefined ? (
				props.JoinButton
			) : (
				<ServerInviteJoinButton {...props} />
			)}
		</div>
	);
};
