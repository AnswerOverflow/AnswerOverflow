import {
	registerServerGroup,
	track,
} from "@packages/database/analytics/server/tracking";
import {
	type AnalyticsChannelWithSettings,
	type AnalyticsMember,
	type AnalyticsMessageInfo,
	type AnalyticsServerWithSettings,
	type AnalyticsThread,
	ConsentSource,
	type MarkSolutionCommandStatus,
} from "@packages/database/analytics/types";
import type {
	Guild,
	GuildMember,
	Message,
	PartialGuildMember,
	ThreadChannel,
} from "discord.js";

export { ConsentSource, registerServerGroup };

type ChannelWithSettings = {
	id: string | bigint;
	name: string;
	type: number;
	serverId: string | bigint;
	flags: {
		indexingEnabled: boolean;
		markSolutionEnabled: boolean;
		sendMarkSolutionInstructionsInNewThreads: boolean;
		autoThreadEnabled: boolean;
		forumGuidelinesConsentEnabled: boolean;
		solutionTagId?: string | bigint;
		inviteCode?: string;
	} | null;
};

type ServerPreferences = {
	readTheRulesConsentEnabled?: boolean;
};

type ServerWithSettings = {
	discordId: string;
	name: string;
};

function guildToServerWithSettings(
	guild: Guild,
	serverPreferences?: { readTheRulesConsentEnabled?: boolean },
): AnalyticsServerWithSettings {
	return {
		id: guild.id,
		name: guild.name,
		readTheRulesConsentEnabled:
			serverPreferences?.readTheRulesConsentEnabled ?? false,
		botTimeInServerMs: guild.joinedAt
			? Date.now() - guild.joinedAt.getTime()
			: 0,
	};
}

function memberToAnalytics(
	member: GuildMember | PartialGuildMember,
): AnalyticsMember {
	return {
		id: member.id,
		joinedAt: member.joinedAt?.getTime(),
		timeInServerMs: member.joinedAt
			? Date.now() - member.joinedAt.getTime()
			: undefined,
	};
}

function threadToAnalytics(thread: ThreadChannel): AnalyticsThread {
	return {
		id: thread.id,
		name: thread.name,
		type: thread.type,
		messageCount: thread.messageCount ?? undefined,
		archivedTimestamp: thread.archivedAt?.getTime(),
		parentId: thread.parentId ?? undefined,
		parentName: thread.parent?.name,
		parentType: thread.parent?.type,
	};
}

function messageToInfo(message: Message): AnalyticsMessageInfo {
	return {
		id: message.id,
		createdAt: message.createdTimestamp,
		contentLength: message.content.length,
		serverId: message.guild?.id,
		channelId: message.channel.isThread()
			? (message.channel.parentId ?? undefined)
			: message.channel.id,
		threadId: message.channel.isThread() ? message.channel.id : undefined,
	};
}

function channelToAnalyticsWithSettings(
	channelSettings: ChannelWithSettings,
): AnalyticsChannelWithSettings {
	return {
		id: String(channelSettings.id),
		name: channelSettings.name,
		type: channelSettings.type,
		serverId: String(channelSettings.serverId),
		inviteCode: channelSettings.flags?.inviteCode ?? undefined,
		solutionTagId: channelSettings.flags?.solutionTagId
			? String(channelSettings.flags.solutionTagId)
			: undefined,
		indexingEnabled: channelSettings.flags?.indexingEnabled ?? false,
		markSolutionEnabled: channelSettings.flags?.markSolutionEnabled ?? false,
		sendMarkSolutionInstructionsInNewThreads:
			channelSettings.flags?.sendMarkSolutionInstructionsInNewThreads ?? false,
		autoThreadEnabled: channelSettings.flags?.autoThreadEnabled ?? false,
		forumGuidelinesConsentEnabled:
			channelSettings.flags?.forumGuidelinesConsentEnabled ?? false,
	};
}

export function trackServerJoin(guild: Guild) {
	return track("Server Join", {
		server: guildToServerWithSettings(guild),
		accountId: guild.ownerId,
	});
}

export function trackServerLeave(guild: Guild) {
	return track("Server Leave", {
		server: guildToServerWithSettings(guild),
		accountId: guild.ownerId,
	});
}

export function trackUserJoinedServer(
	member: GuildMember,
	_server: ServerWithSettings,
	serverPreferences?: ServerPreferences,
) {
	return track("User Joined Server", {
		server: guildToServerWithSettings(member.guild, serverPreferences),
		user: memberToAnalytics(member),
		accountId: member.id,
	});
}

export function trackUserLeftServer(
	member: GuildMember | PartialGuildMember,
	_server: ServerWithSettings,
	serverPreferences?: ServerPreferences,
) {
	return track("User Left Server", {
		server: guildToServerWithSettings(member.guild, serverPreferences),
		user: memberToAnalytics(member),
		accountId: member.id,
	});
}

export function trackAskedQuestion(
	thread: ThreadChannel,
	channelSettings: ChannelWithSettings,
	questionAsker: GuildMember,
	_server: ServerWithSettings,
	serverPreferences?: ServerPreferences,
	question?: Message | null,
) {
	console.log(
		"trackAskedQuestion",
		thread.parent?.id,
		channelSettings.flags?.indexingEnabled,
		channelSettings.flags?.markSolutionEnabled,
	);
	return track("Asked Question", {
		server: guildToServerWithSettings(thread.guild, serverPreferences),
		channel: channelToAnalyticsWithSettings(channelSettings),
		thread: threadToAnalytics(thread),
		questionAsker: memberToAnalytics(questionAsker),
		question: question
			? messageToInfo(question)
			: { id: "", createdAt: 0, contentLength: 0 },
		accountId: questionAsker.id,
	});
}

export function trackSolvedQuestion(
	thread: ThreadChannel,
	channelSettings: ChannelWithSettings,
	questionAsker: GuildMember,
	questionSolver: GuildMember,
	markAsSolver: GuildMember,
	question: Message,
	solution: Message,
	_server: ServerWithSettings,
	serverPreferences?: ServerPreferences,
) {
	return track("Solved Question", {
		server: guildToServerWithSettings(thread.guild, serverPreferences),
		channel: channelToAnalyticsWithSettings(channelSettings),
		thread: threadToAnalytics(thread),
		questionAsker: memberToAnalytics(questionAsker),
		questionSolver: memberToAnalytics(questionSolver),
		markAsSolver: memberToAnalytics(markAsSolver),
		question: messageToInfo(question),
		solution: messageToInfo(solution),
		"Time To Solve In Ms":
			solution.createdTimestamp - question.createdTimestamp,
		accountId: questionSolver.id,
	});
}

export function trackMarkSolutionInstructionsSent(
	thread: ThreadChannel,
	channelSettings: ChannelWithSettings,
	questionAsker: GuildMember,
	_server: ServerWithSettings,
	serverPreferences?: ServerPreferences,
	question?: Message | null,
) {
	return track("Mark Solution Instructions Sent", {
		server: guildToServerWithSettings(thread.guild, serverPreferences),
		channel: channelToAnalyticsWithSettings(channelSettings),
		thread: threadToAnalytics(thread),
		questionAsker: memberToAnalytics(questionAsker),
		question: question
			? messageToInfo(question)
			: { id: "", createdAt: 0, contentLength: 0 },
		accountId: questionAsker.id,
	});
}

export function trackMarkSolutionCommandUsed(
	member: GuildMember,
	status: MarkSolutionCommandStatus,
) {
	return track("Mark Solution Application Command Used", {
		user: memberToAnalytics(member),
		Status: status,
		accountId: member.id,
	});
}

export function trackDismissButtonClicked(
	member: GuildMember,
	_message: Message,
) {
	return track("Dismiss Button Clicked", {
		user: memberToAnalytics(member),
		"Dismissed Message Type": "Mark Solution Instructions",
		accountId: member.id,
	});
}

export function trackUserGrantConsent(
	member: GuildMember,
	consentSource: ConsentSource,
) {
	return track("User Grant Consent", {
		user: memberToAnalytics(member),
		"Consent Source": consentSource,
		accountId: member.id,
	});
}

export function trackLeaderboardViewed(member: GuildMember) {
	return track("Leaderboard Viewed", {
		user: memberToAnalytics(member),
		accountId: member.id,
	});
}

export function trackQuickActionCommandSent(member: GuildMember) {
	return track("Quick Action Command Sent", {
		user: memberToAnalytics(member),
		accountId: member.id,
	});
}

export function trackSimilarThreadsButtonClicked(
	member: GuildMember,
	thread: ThreadChannel,
	resultsCount: number,
) {
	return track("Similar Threads Button Clicked", {
		server: { id: thread.guild.id, name: thread.guild.name },
		user: memberToAnalytics(member),
		thread: threadToAnalytics(thread),
		"Results Count": resultsCount,
		accountId: member.id,
	});
}

export function trackSimilarThreadSolvedClicked(
	member: GuildMember,
	sourceThread: ThreadChannel,
	similarThreadId: string,
) {
	return track("Similar Thread Solved Clicked", {
		server: { id: sourceThread.guild.id, name: sourceThread.guild.name },
		user: memberToAnalytics(member),
		thread: threadToAnalytics(sourceThread),
		"Similar Thread Id": similarThreadId,
		accountId: member.id,
	});
}
