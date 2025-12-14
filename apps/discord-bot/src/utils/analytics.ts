import {
	registerServerGroup as registerServerGroupBase,
	trackEvent,
} from "@packages/database/analytics/server/tracking";
import {
	ConsentSource,
	type MarkSolutionCommandStatus,
} from "@packages/database/analytics/server/types";
import type {
	Guild,
	GuildMember,
	Message,
	PartialGuildMember,
	ThreadChannel,
} from "discord.js";

export { ConsentSource };

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

export function trackServerJoin(guild: Guild) {
	return trackEvent("Server Join", {
		"Answer Overflow Account Id": guild.ownerId,
		guild,
	});
}

export function trackServerLeave(guild: Guild) {
	return trackEvent("Server Leave", {
		"Answer Overflow Account Id": guild.ownerId,
		guild,
	});
}

export function registerServerGroup(guild: Guild, serverId: string) {
	return registerServerGroupBase({
		"Server Id": serverId,
		"Server Name": guild.name,
	});
}

export function trackUserJoinedServer(
	member: GuildMember,
	server: ServerWithSettings,
	serverPreferences?: ServerPreferences,
) {
	return trackEvent("User Joined Server", {
		"Answer Overflow Account Id": member.id,
		guild: member.guild,
		serverWithSettings: server,
		serverPreferences,
		members: [{ prefix: "User", member }],
	});
}

export function trackUserLeftServer(
	member: GuildMember | PartialGuildMember,
	server: ServerWithSettings,
	serverPreferences?: ServerPreferences,
) {
	return trackEvent("User Left Server", {
		"Answer Overflow Account Id": member.id,
		guild: member.guild,
		serverWithSettings: server,
		serverPreferences,
		members: [{ prefix: "User", member }],
	});
}

export function trackAskedQuestion(
	thread: ThreadChannel,
	channelSettings: ChannelWithSettings,
	questionAsker: GuildMember,
	server: ServerWithSettings,
	serverPreferences?: ServerPreferences,
	question?: Message | null,
) {
	console.log(
		"trackAskedQuestion",
		thread.parent?.id,
		channelSettings.flags?.indexingEnabled,
		channelSettings.flags?.markSolutionEnabled,
	);
	return trackEvent("Asked Question", {
		"Answer Overflow Account Id": questionAsker.id,
		guild: thread.guild,
		serverWithSettings: server,
		serverPreferences,
		channel: thread.parent!,
		channelWithSettings: channelSettings,
		thread,
		members: [{ prefix: "Question Asker", member: questionAsker }],
		messages: question ? [{ prefix: "Question", message: question }] : [],
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
	server: ServerWithSettings,
	serverPreferences?: ServerPreferences,
) {
	return trackEvent("Solved Question", {
		"Answer Overflow Account Id": questionSolver.id,
		guild: thread.guild,
		serverWithSettings: server,
		serverPreferences,
		channel: thread.parent!,
		channelWithSettings: channelSettings,
		thread,
		members: [
			{ prefix: "Question Asker", member: questionAsker },
			{ prefix: "Question Solver", member: questionSolver },
			{ prefix: "Mark As Solver", member: markAsSolver },
		],
		messages: [
			{ prefix: "Question", message: question },
			{ prefix: "Solution", message: solution },
		],
		"Time To Solve In Ms":
			solution.createdTimestamp - question.createdTimestamp,
	});
}

export function trackMarkSolutionInstructionsSent(
	thread: ThreadChannel,
	channelSettings: ChannelWithSettings,
	questionAsker: GuildMember,
	server: ServerWithSettings,
	serverPreferences?: ServerPreferences,
	question?: Message | null,
) {
	return trackEvent("Mark Solution Instructions Sent", {
		"Answer Overflow Account Id": questionAsker.id,
		guild: thread.guild,
		serverWithSettings: server,
		serverPreferences,
		channel: thread.parent!,
		channelWithSettings: channelSettings,
		thread,
		members: [{ prefix: "Question Asker", member: questionAsker }],
		messages: question ? [{ prefix: "Question", message: question }] : [],
	});
}

export function trackMarkSolutionCommandUsed(
	member: GuildMember,
	status: MarkSolutionCommandStatus,
) {
	return trackEvent("Mark Solution Application Command Used", {
		"Answer Overflow Account Id": member.id,
		members: [{ prefix: "User", member }],
		Status: status,
	});
}

export function trackDismissButtonClicked(
	member: GuildMember,
	message: Message,
) {
	return trackEvent("Dismiss Button Clicked", {
		"Answer Overflow Account Id": member.id,
		members: [{ prefix: "User", member }],
		messages: [{ prefix: "Message", message }],
		"Dismissed Message Type": "Mark Solution Instructions" as const,
	});
}

export function trackUserGrantConsent(
	member: GuildMember,
	consentSource: ConsentSource,
) {
	return trackEvent("User Grant Consent", {
		"Answer Overflow Account Id": member.id,
		members: [{ prefix: "User", member }],
		"Consent Source": consentSource,
	});
}

export function trackLeaderboardViewed(member: GuildMember) {
	return trackEvent("Leaderboard Viewed", {
		"Answer Overflow Account Id": member.id,
		members: [{ prefix: "User", member }],
	});
}

export function trackQuickActionCommandSent(member: GuildMember) {
	return trackEvent("Quick Action Command Sent", {
		"Answer Overflow Account Id": member.id,
		members: [{ prefix: "User", member }],
	});
}
