/* eslint-disable @typescript-eslint/naming-convention */
import {
	ChannelPropsWithSettings,
	ServerPropsWithSettings,
	ThreadProps,
	channelWithSettingsToAnalyticsData,
	serverWithSettingsToAnalyticsData,
} from '@answeroverflow/constants';
import type {
	AnyThreadChannel,
	Channel,
	Guild,
	GuildMember,
	Message,
} from 'discord.js';
import type { ChannelWithFlags, ServerWithFlags } from '@answeroverflow/db';
import { BaseProps, trackServerSideEvent } from '@answeroverflow/analytics';
import { sentryLogger } from './sentry';

export type ServerPropsWithDiscordData = ServerPropsWithSettings & {
	'Bot Time In Server In Ms': number;
};

export type ChannelPropsWithDiscordData = ChannelPropsWithSettings;

export function serverWithDiscordInfoToAnalyticsData(args: {
	serverWithSettings: ServerWithFlags;
	guild: Guild;
}): ServerPropsWithDiscordData {
	return {
		...serverWithSettingsToAnalyticsData(args.serverWithSettings),
		'Bot Time In Server In Ms':
			new Date().getTime() - args.guild.joinedAt.getTime(),
	};
}

export function channelWithDiscordInfoToAnalyticsData(args: {
	answerOverflowChannel: ChannelWithFlags;
	discordChannel: Channel;
}): ChannelPropsWithDiscordData {
	return {
		...channelWithSettingsToAnalyticsData(args.answerOverflowChannel),
	};
}

export function threadWithDiscordInfoToAnalyticsData(args: {
	thread: AnyThreadChannel;
}): ThreadProps {
	return {
		'Thread Id': args.thread.id,
		'Thread Name': args.thread.name,
		'Thread Type': args.thread.type,
		'Number of Messages': args.thread.messageCount ?? 0,
		'Thread Archived Timestamp': args.thread.archivedAt?.getTime() ?? 0,
		'Thread Parent Id': args.thread.parentId ?? undefined,
		'Thread Parent Name': args.thread.parent?.name ?? undefined,
		'Thread Parent Type': args.thread.parent?.type ?? undefined,
	};
}

export const userTypes = [
	'User',
	'Question Asker',
	'Question Solver',
	'Mark As Solver',
] as const;
export type UserType = (typeof userTypes)[number];

type UserProps<T extends UserType> = {
	[K in
		| `${T} Id`
		| `${T} Joined At`
		| `${T} Time In Server In Ms`]: K extends `${T} Id`
		? string
		: number | undefined;
};

export const messageTypes = ['Question', 'Solution'] as const;

export type MessageType = (typeof messageTypes)[number];

type MessageProps<T extends MessageType> = {
	[K in
		| `${T} Id`
		| `${T} Created At`
		| `${T} Content Length`
		| `${T} Server Id`
		| `${T} Channel Id`
		| `${T} Thread Id`]: K extends `${T} Id` ? string : number | undefined;
};

type ServerJoinProps = ServerPropsWithDiscordData;
type ServerLeaveProps = ServerPropsWithDiscordData;
type UserJoinedServerProps = ServerPropsWithDiscordData & UserProps<'User'>;
type UserLeftServerProps = ServerPropsWithDiscordData & UserProps<'User'>;

type QuestionAskedProps = ServerPropsWithDiscordData &
	ChannelPropsWithDiscordData &
	ThreadProps &
	UserProps<'Question Asker'> &
	MessageProps<'Question'>;

export type QuestionSolvedProps = QuestionAskedProps &
	UserProps<'Question Solver'> &
	UserProps<'Mark As Solver'> & {
		'Time To Solve In Ms': number;
	} & MessageProps<'Solution'>;

type MarkSolutionUsedProps = UserProps<'User'> & {};

type EventMap = {
	'Server Join': ServerJoinProps;
	'Server Leave': ServerLeaveProps;
	'User Joined Server': UserJoinedServerProps;
	'User Left Server': UserLeftServerProps;
	'Asked Question': QuestionAskedProps;
	'Solved Question': QuestionSolvedProps;
	'Mark Solution Used': MarkSolutionUsedProps;
};

export function memberToAnalyticsUser<T extends UserType>(
	userType: T,
	user: GuildMember,
): UserProps<T> {
	return {
		[`${userType} Id`]: user.id,
		[`${userType} Joined At`]: user.joinedAt?.getTime(),
		[`${userType} Time In Server In Ms`]:
			user.joinedAt?.getTime() &&
			new Date().getTime() - user.joinedAt.getTime(),
	} as UserProps<T>;
}

export function messageToAnalyticsMessage<T extends MessageType>(
	messageType: T,
	message: Message,
): MessageProps<T> {
	return {
		[`${messageType} Id`]: message.id,
		[`${messageType} Created At`]: message.createdTimestamp,
		[`${messageType} Content Length`]: message.content.length,
		[`${messageType} Server Id`]: message.guild?.id,
		[`${messageType} Channel Id`]: message.channel.isThread()
			? message.channel.parentId
			: message.channel.id,
		[`${messageType} Thread Id`]: message.channel.isThread()
			? message.channel.id
			: undefined,
	} as MessageProps<T>;
}

export function trackDiscordEvent<K extends keyof EventMap>(
	event: K,
	props: (EventMap[K] & BaseProps) | (() => Promise<EventMap[K] & BaseProps>),
) {
	if (props instanceof Function) {
		void props()
			.then((props) => trackServerSideEvent(event, props))
			.catch((error) => {
				if (error instanceof Error) {
					sentryLogger(error.message, {
						event,
					});
				}
			});
		return;
	}
	trackServerSideEvent(event, props);
}
