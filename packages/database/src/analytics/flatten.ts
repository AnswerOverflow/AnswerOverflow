import type {
	AnalyticsChannel,
	AnalyticsChannelWithSettings,
	AnalyticsMember,
	AnalyticsMessage,
	AnalyticsMessageInfo,
	AnalyticsServer,
	AnalyticsServerWithSettings,
	AnalyticsThread,
} from "./types";

export type FlatServerProps = {
	"Server Id": string;
	"Server Name": string;
};

export type FlatServerWithSettingsProps = FlatServerProps & {
	"Read the Rules Consent Enabled": boolean;
	"Bot Time In Server In Ms": number;
};

export type FlatChannelProps = {
	"Channel Id": string;
	"Channel Name": string;
	"Channel Type": number;
	"Channel Server Id"?: string;
	"Channel Invite Code"?: string;
};

export type FlatChannelWithSettingsProps = FlatChannelProps & {
	"Channel Solution Tag Id"?: string;
	"Indexing Enabled": boolean;
	"Mark Solution Enabled": boolean;
	"Send Mark Solution Instructions In New Threads Enabled": boolean;
	"Auto Thread Enabled": boolean;
	"Forum Guidelines Consent Enabled": boolean;
};

export type FlatThreadProps = {
	"Thread Id": string;
	"Thread Name": string;
	"Thread Type": number;
	"Thread Archived Timestamp"?: number;
	"Thread Parent Id"?: string;
	"Thread Parent Name"?: string;
	"Thread Parent Type"?: number;
	"Number of Messages"?: number;
};

export type FlatMessageProps = {
	"Message Id": string;
	"Message Author Id": string;
	"Server Id": string;
	"Channel Id": string;
	"Thread Id"?: string;
};

export function flattenServer(server: AnalyticsServer): FlatServerProps {
	return {
		"Server Id": server.id,
		"Server Name": server.name,
	};
}

export function flattenServerWithSettings(
	server: AnalyticsServerWithSettings,
): FlatServerWithSettingsProps {
	return {
		...flattenServer(server),
		"Read the Rules Consent Enabled": server.readTheRulesConsentEnabled,
		"Bot Time In Server In Ms": server.botTimeInServerMs,
	};
}

export function flattenChannel(channel: AnalyticsChannel): FlatChannelProps {
	return {
		"Channel Id": channel.id,
		"Channel Name": channel.name,
		"Channel Type": channel.type,
		"Channel Server Id": channel.serverId,
		"Channel Invite Code": channel.inviteCode ?? undefined,
	};
}

export function flattenChannelWithSettings(
	channel: AnalyticsChannelWithSettings,
): FlatChannelWithSettingsProps {
	return {
		...flattenChannel(channel),
		"Channel Solution Tag Id": channel.solutionTagId,
		"Indexing Enabled": channel.indexingEnabled,
		"Mark Solution Enabled": channel.markSolutionEnabled,
		"Send Mark Solution Instructions In New Threads Enabled":
			channel.sendMarkSolutionInstructionsInNewThreads,
		"Auto Thread Enabled": channel.autoThreadEnabled,
		"Forum Guidelines Consent Enabled": channel.forumGuidelinesConsentEnabled,
	};
}

export function flattenThread(thread: AnalyticsThread): FlatThreadProps {
	return {
		"Thread Id": thread.id,
		"Thread Name": thread.name,
		"Thread Type": thread.type,
		"Thread Archived Timestamp": thread.archivedTimestamp,
		"Thread Parent Id": thread.parentId,
		"Thread Parent Name": thread.parentName,
		"Thread Parent Type": thread.parentType,
		"Number of Messages": thread.messageCount,
	};
}

export function flattenMessage(message: AnalyticsMessage): FlatMessageProps {
	return {
		"Message Id": message.id,
		"Message Author Id": message.authorId,
		"Server Id": message.serverId,
		"Channel Id": message.channelId,
		"Thread Id": message.threadId,
	};
}

export function flattenMember(
	member: AnalyticsMember,
	prefix: "Question Asker" | "Question Solver" | "Mark As Solver" | "User",
) {
	return {
		[`${prefix} Id`]: member.id,
		[`${prefix} Joined At`]: member.joinedAt,
		[`${prefix} Time In Server In Ms`]: member.timeInServerMs,
	};
}

export function flattenMessageInfo(
	info: AnalyticsMessageInfo,
	prefix: "Question" | "Solution",
) {
	return {
		[`${prefix} Id`]: info.id,
		[`${prefix} Created At`]: info.createdAt,
		[`${prefix} Content Length`]: info.contentLength,
		[`${prefix} Server Id`]: info.serverId,
		[`${prefix} Channel Id`]: info.channelId,
		[`${prefix} Thread Id`]: info.threadId,
	};
}
