/* eslint-disable @typescript-eslint/naming-convention */
import {
	ChannelPropsWithSettings,
	ServerPropsWithSettings,
	ThreadProps,
	channelWithSettingsToAnalyticsData,
	serverWithSettingsToAnalyticsData,
} from '@answeroverflow/constants';
import type { AnyThreadChannel, Channel, Guild } from 'discord.js';
import type { ChannelWithFlags, ServerWithFlags } from '@answeroverflow/db';
import { BaseProps, trackServerSideEvent } from '@answeroverflow/analytics';

export type ServerPropsWithDiscordData = ServerPropsWithSettings & {
	'Time In Server': number;
};

export type ChannelPropsWithDiscordData = ChannelPropsWithSettings;

export function serverWithDiscordInfoToAnalyticsData(args: {
	serverWithSettings: ServerWithFlags;
	guild: Guild;
}): ServerPropsWithDiscordData {
	return {
		...serverWithSettingsToAnalyticsData(args.serverWithSettings),
		'Time In Server': new Date().getTime() - args.guild.joinedAt.getTime(),
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

type ServerJoinProps = ServerPropsWithDiscordData;
type ServerLeaveProps = ServerPropsWithDiscordData;
type QuestionAskedProps = ServerPropsWithDiscordData &
	ChannelPropsWithDiscordData &
	ThreadProps;

type EventMap = {
	'Server Join': ServerJoinProps;
	'Server Leave': ServerLeaveProps;
	'Question Asked': QuestionAskedProps;
};

export function trackDiscordEvent(
	event: keyof EventMap,
	props: EventMap[keyof EventMap] & BaseProps,
) {
	trackServerSideEvent(event, props);
}
