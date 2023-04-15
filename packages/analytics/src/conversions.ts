import type {
	ServerWithSettingsProps,
	ChannelPropsWithSettings,
	ThreadProps,
} from '@answeroverflow/constants';

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
