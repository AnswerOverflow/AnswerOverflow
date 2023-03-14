import type { ChannelPublicWithFlags, ServerPublic } from '@answeroverflow/api';
import { createContext } from 'react';
import {
	ChatBubbleLeftRightIcon,
	HashtagIcon,
} from '@heroicons/react/24/outline';
import React from 'react';
import { ChannelType } from '~ui/utils/discord';
import { ServerIcon } from './ServerIcon';
import Link from 'next/link';
// eslint-disable-next-line @typescript-eslint/naming-convention
const ServerInviteContext = createContext<{
	server: ServerPublic;
	channel?: ChannelPublicWithFlags;
	isUserInServer: boolean;
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

const ServerInviteTitle = () => {
	const { server } = useServerInviteContext();
	return (
		<h3 className="pt-2 text-center font-header text-2xl font-bold text-ao-black dark:text-ao-white">
			{server.name}
		</h3>
	);
};

const ServerInviteChannelName = () => {
	const { channel } = useServerInviteContext();

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

	if (!channel) return <></>;

	return (
		<div className="flex flex-row items-center justify-center align-middle">
			{getChannelTypeIcon(channel.type)}
			<h4 className="text-center font-header text-xl font-bold text-ao-black dark:text-ao-white">
				{channel.name}
			</h4>
		</div>
	);
};

// TODO: Make this a link button
const ServerInviteJoinButton = () => {
	const { channel, isUserInServer } = useServerInviteContext();
	if (!channel?.inviteCode) return <></>;
	return (
		<Link
			href={`https://discord.gg/${channel?.inviteCode}`}
			target={'Blank'}
			referrerPolicy="no-referrer"
			className="text-center font-header text-xl font-bold "
		>
			{isUserInServer ? <>Joined</> : <>Join</>}
		</Link>
	);
};

export const ServerInviteIcon = () => {
	const { server } = useServerInviteContext();
	return <ServerIcon server={server} size="md" />;
};

export const ServerInviteRenderer = (props: {
	server: ServerPublic;
	channel?: ChannelPublicWithFlags;
	isUserInServer: boolean;
}) => {
	return (
		<ServerInviteContext.Provider value={props}>
			<div className="flex h-full w-full flex-col items-center justify-center">
				<div className="flex h-full w-full flex-col items-center justify-center">
					<ServerInviteIcon />
					<ServerInviteTitle />
					<ServerInviteChannelName />
					<ServerInviteJoinButton />
				</div>
			</div>
		</ServerInviteContext.Provider>
	);
};

export const ServerInvite = (props: {
	server: ServerPublic;
	channel?: ChannelPublicWithFlags;
}) => {
	return <ServerInviteRenderer {...props} isUserInServer={false} />;
};
