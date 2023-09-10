import type { Message } from '@answeroverflow/elastic-types';
// eslint-disable-next-line no-restricted-imports
import type { Channel, Server } from '../../db/src/schema';
// eslint-disable-next-line no-restricted-imports
import { ServerWithFlags } from '../../db/src/zodSchemas/serverSchemas';
// eslint-disable-next-line no-restricted-imports
import { ChannelWithFlags } from '../../db/src/zodSchemas/channelSchemas';
export const NUMBER_OF_MESSAGES_FIELD_NAME = 'Number of Messages';
export type Snowflake = string;

export type MessageProps = {
	'Message Id': Snowflake;
	'Message Author Id': Snowflake;
	'Solution Id'?: Snowflake;
} & Pick<ServerProps, 'Server Id'> &
	Pick<ChannelProps, 'Channel Id'> &
	Partial<Pick<ThreadProps, 'Thread Id'>>;

export function messageToAnalyticsData(
	message: Pick<
		Message,
		| 'id'
		| 'authorId'
		| 'solutionIds'
		| 'channelId'
		| 'serverId'
		| 'parentChannelId'
	>,
): MessageProps {
	return {
		'Message Id': message.id,
		'Message Author Id': message.authorId,
		'Channel Id': message.parentChannelId ?? message.channelId,
		'Thread Id': message.parentChannelId ? message.channelId : undefined,
		'Server Id': message.serverId,
		'Solution Id':
			message.solutionIds.length > 0 ? message.solutionIds[0] : undefined,
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

export type ServerPropsWithSettings = ServerProps & {
	'Read the Rules Consent Enabled': boolean;
};

export function serverWithSettingsToAnalyticsData(
	server: ServerWithFlags,
): ServerPropsWithSettings {
	return {
		'Server Id': server.id,
		'Server Name': server.name,
		'Read the Rules Consent Enabled': server.flags.readTheRulesConsentEnabled,
	};
}

export type ChannelProps = {
	'Channel Id': Snowflake;
	'Channel Name': string;
	'Channel Type': number;
	'Channel Server Id': Snowflake;
	'Channel Invite Code'?: string;
};
export function channelToAnalyticsData(
	channel: Pick<Channel, 'id' | 'name' | 'type' | 'serverId' | 'inviteCode'>,
): ChannelProps {
	return {
		'Channel Id': channel.id,
		'Channel Name': channel.name,
		'Channel Type': channel.type,
		'Channel Server Id': channel.serverId,
		'Channel Invite Code': channel.inviteCode ?? undefined,
	};
}

export type ChannelPropsWithSettings = ChannelProps & {
	'Channel Solution Tag Id'?: Snowflake;
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
	'Thread Archived Timestamp'?: number;
	'Thread Parent Id'?: Snowflake;
	'Thread Parent Name'?: string;
	'Thread Parent Type'?: number;
	'Number of Messages'?: number;
};

export function threadToAnalyticsData(
	thread: Pick<
		Channel,
		'id' | 'name' | 'type' | 'archivedTimestamp' | 'parentId'
	>,
): ThreadProps {
	return {
		'Thread Id': thread.id,
		'Thread Name': thread.name,
		'Thread Type': thread.type,
		'Thread Archived Timestamp': thread.archivedTimestamp
			? Number(thread.archivedTimestamp)
			: undefined, // TODO: Remove when posthog support serializing bigint
		'Thread Parent Id': thread.parentId ?? undefined,
	};
}

export const JOIN_WAITLIST_EVENT_NAME = 'Join Waitlist Click';
export type JoinWaitlistClickProps = {
	'Button Location': 'Pricing Page' | 'Experimental Settings Menu';
};

export type ServerInviteClickProps = {
	'Button Location':
		| 'Search Results'
		| 'Community Page'
		| 'Message Result Page';
} & ServerProps &
	Partial<ChannelProps> &
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
