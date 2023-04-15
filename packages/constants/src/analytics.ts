import type {
	Channel,
	ChannelWithFlags,
	Server,
	ServerWithFlags,
} from '@answeroverflow/prisma-types';
import type { Message } from '@answeroverflow/elastic-types';
export const NUMBER_OF_MESSAGES_FIELD_NAME = 'Number of Messages';
export type Snowflake = string;

export type MessageProps = {
	'Message Id': Snowflake;
	'Message Author Id': Snowflake;
	'Solution Id'?: Snowflake[];
};

export function messageToAnalyticsData(
	message: Pick<Message, 'id' | 'authorId' | 'solutionIds'>,
): MessageProps {
	return {
		'Message Id': message.id,
		'Message Author Id': message.authorId,
		'Solution Id': message.solutionIds,
	};
}

export type ServerProps = {
	'Server Id': Snowflake;
	'Server Name': string;
};

export function serverToAnalyticsData(
	server: Pick<Server, 'id' | 'name'>,
): ServerProps {
	return {
		'Server Id': server.id,
		'Server Name': server.name,
	};
}

export type ServerWithSettingsProps = ServerProps & {
	'Server Flags': Record<string, boolean>;
};

export function serverToServerWithSettingsAnalyticsProps(
	server: Pick<ServerWithFlags, 'id' | 'name' | 'flags'>,
): ServerWithSettingsProps {
	return {
		...serverToAnalyticsData(server),
		'Server Flags': server.flags,
	};
}

export type ChannelProps = {
	'Channel Id': Snowflake;
	'Channel Name': string;
	'Channel Type': number;
	'Channel Server Id': Snowflake;
};

export function channelToAnalyticsData(
	channel: Pick<Channel, 'id' | 'name' | 'type' | 'serverId'>,
): ChannelProps {
	return {
		'Channel Id': channel.id,
		'Channel Name': channel.name,
		'Channel Type': channel.type,
		'Channel Server Id': channel.serverId,
	};
}

export type ChannelPropsWithSettings = ChannelProps & {
	'Channel Solution Tag Id'?: Snowflake;
	'Channel Invite Code'?: string;
	'Indexing Enabled': boolean;
	'Mark Solution Enabled': boolean;
	'Send Mark Solution Instructions In New Threads Enabled': boolean;
	'Auto Thread Enabled': boolean;
	'Forum Guidelines Consent Enabled': boolean;
};

export function channelWithSettingsToAnalyticsData(
	channel: ChannelWithFlags,
): ChannelPropsWithSettings {
	return {
		...channelToAnalyticsData(channel),
		'Channel Solution Tag Id': channel.solutionTagId ?? undefined,
		'Channel Invite Code': channel.inviteCode ?? undefined,
		'Channel Server Id': channel.serverId,

		'Indexing Enabled': channel.flags.indexingEnabled,
		'Mark Solution Enabled': channel.flags.markSolutionEnabled,
		'Send Mark Solution Instructions In New Threads Enabled':
			channel.flags.sendMarkSolutionInstructionsInNewThreads,
		'Auto Thread Enabled': channel.flags.autoThreadEnabled,
		'Forum Guidelines Consent Enabled':
			channel.flags.forumGuidelinesConsentEnabled,
	};
}

export type ThreadProps = {
	'Thread Id': Snowflake;
	'Thread Name': string;
	'Thread Type': number;
	'Thread Archived At'?: number;
	'Thread Parent Id'?: Snowflake;
	'Thread Parent Name'?: string;
	'Thread Parent Type'?: number;
};

export const JOIN_WAITLIST_EVENT_NAME = 'Join Waitlist Click';
export type JoinWaitlistClickProps = {
	'Button Location': 'Pricing Page' | 'Experimental Settings Menu';
};

export type ServerInviteClickProps = {
	'Button Location':
		| 'Search Results'
		| 'Community Page'
		| 'Message Result Page';
	'Invite Code': string;
} & ServerProps &
	ChannelProps &
	Partial<ThreadProps>;

export type ServerInviteEvent = {
	'Server Invite Click': ServerInviteClickProps;
};

export type CommunityPageLinkClickProps = {
	'Link Location':
		| 'Community Page'
		| 'Search Results'
		| 'About Marquee'
		| 'Message Result Page';
} & ServerProps &
	Partial<ChannelProps> &
	Partial<ThreadProps>;

export type CommunityPageLinkEvent = {
	'Community Page Link Click': CommunityPageLinkClickProps;
};
