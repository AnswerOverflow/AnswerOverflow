import type {
	AnalyticsChannel,
	AnalyticsMessage,
	AnalyticsServer,
	AnalyticsThread,
	ChannelProps,
	MessageProps,
	ServerProps,
	ThreadProps,
} from "./types";

export function serverToAnalyticsData(server: AnalyticsServer): ServerProps {
	return {
		"Server Id": server.id,
		"Server Name": server.name,
	};
}

export function channelToAnalyticsData(
	channel: AnalyticsChannel,
): ChannelProps {
	return {
		"Channel Id": channel.id,
		"Channel Name": channel.name,
		"Channel Type": channel.type,
		"Channel Server Id": channel.serverId,
		"Channel Invite Code": channel.inviteCode ?? undefined,
	};
}

export function threadToAnalyticsData(thread: AnalyticsThread): ThreadProps {
	return {
		"Thread Id": thread.id,
		"Thread Name": thread.name,
		"Thread Type": thread.type,
		"Thread Archived Timestamp": thread.archivedTimestamp,
		"Thread Parent Id": thread.parentId,
		"Thread Parent Name": thread.parentName ?? undefined,
		"Thread Parent Type": thread.parentType ?? undefined,
		"Number of Messages": thread.messageCount ?? undefined,
	};
}

export function messageToAnalyticsData(
	message: AnalyticsMessage,
): MessageProps {
	return {
		"Message Id": message.id,
		"Message Author Id": message.authorId,
		"Server Id": message.serverId,
		"Channel Id": message.channelId,
		"Thread Id": message.threadId,
	};
}
