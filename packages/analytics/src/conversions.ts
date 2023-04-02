import type {
	ServerWithSettingsProps,
	ChannelPropsWithSettings,
	ThreadProps,
} from 'packages/constants';
import type { ServerWithFlags, ChannelWithFlags } from '@answeroverflow/db';
export function toAOAnalyticsServer(
	server: ServerWithFlags,
): ServerWithSettingsProps {
	return {
		'Server Id': server.id,
		'Server Name': server.name,
		'Server Flags': server.flags,
	};
}

export function toAOAnalyticsChannel(
	channel: ChannelWithFlags,
): ChannelPropsWithSettings {
	return {
		'Channel Flags': channel.flags,
		'Channel Id': channel.id,
		'Channel Name': channel.name,
		'Channel Type': channel.type,
		'Channel Solution Tag Id': channel.solutionTagId ?? undefined,
		'Channel Invite Code': channel.inviteCode ?? undefined,
		'Channel Server Id': channel.serverId,
	};
}

export function toAOAnalyticsThread(thread: AnyThreadChannel): ThreadProps {
	return {
		'Thread Id': thread.id,
		'Thread Name': thread.name,
		'Thread Parent Id': thread.parentId ?? undefined,
		'Thread Parent Name': thread.parent?.name,
		'Thread Parent Type': thread.parent?.type,
		'Thread Type': thread.type,
		'Thread Archived At':
			thread.type === ChannelType.PrivateThread
				? undefined
				: thread.archiveTimestamp ?? undefined,
	};
}
