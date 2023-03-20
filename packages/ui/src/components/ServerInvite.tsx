import type { ChannelPublicWithFlags, ServerPublic } from '@answeroverflow/api';
import { createContext } from 'react';
import {
	ChatBubbleLeftRightIcon,
	HashtagIcon,
} from '@heroicons/react/24/outline';
import React from 'react';
import { ChannelType } from '~ui/utils/discord';
import { ServerIcon } from './ServerIcon';
import { useIsUserInServer } from '../utils';
import { LinkButton } from './primitives/LinkButton';
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
		<h3 className="text-center font-header text-lg font-bold leading-5 text-ao-black dark:text-ao-white">
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
		<div className="flex flex-row items-center justify-center">
			{getChannelTypeIcon(channel.type)}
			<h4 className="text-center font-body text-base font-bold leading-5 text-ao-black dark:text-ao-white">
				{channel.name}
			</h4>
		</div>
	);
};

// TODO: Make this a link button
const ServerInviteJoinButton = () => {
	const { channel, isUserInServer } = useServerInviteContext();
	console.log('foo');
	if (!channel?.inviteCode) return <></>;
	return (
		<LinkButton
			href={`https://discord.gg/${channel?.inviteCode}`}
			variant="default"
			referrerPolicy="no-referrer"
			className="text-center font-header font-bold "
		>
			{isUserInServer ? <>Joined</> : <>Join Server</>}
		</LinkButton>
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
			<div className="flex h-full w-full flex-col items-center justify-center gap-1">
				<div className="flex flex-col">
					<div className="flex flex-row items-center justify-center pb-5 align-middle">
						<ServerInviteIcon />
						<div className="flex flex-col items-center justify-center pl-2">
							<ServerInviteTitle />
							<ServerInviteChannelName />
						</div>
					</div>
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
	const isUserInServer = useIsUserInServer(props.server.id);
	return <ServerInviteRenderer {...props} isUserInServer={isUserInServer} />;
};
