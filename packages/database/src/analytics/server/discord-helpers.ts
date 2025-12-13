import type {
	Channel,
	Guild,
	GuildMember,
	Message,
	PartialGuildMember,
	ThreadChannel,
} from "discord.js";
import type {
	ChannelPropsWithDiscordData,
	MessageProps,
	MessageType,
	ServerPropsWithDiscordData,
	ThreadProps,
	UserProps,
	UserType,
} from "./types";

type ServerWithSettings = {
	discordId: string;
	name: string;
	preferencesId?: string;
};

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

export function memberToAnalyticsUser<T extends UserType>(
	userType: T,
	user: GuildMember | PartialGuildMember,
): UserProps<T> {
	return {
		[`${userType} Id`]: user.id,
		[`${userType} Joined At`]: user.joinedAt?.getTime(),
		[`${userType} Time In Server In Ms`]:
			user.joinedAt?.getTime() && Date.now() - user.joinedAt.getTime(),
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

export function serverWithDiscordInfoToAnalyticsData(args: {
	serverWithSettings: ServerWithSettings;
	guild: Guild;
	serverPreferences?: ServerPreferences;
}): ServerPropsWithDiscordData {
	return {
		"Server Id": args.guild.id,
		"Server Name": args.guild.name,
		"Read the Rules Consent Enabled":
			args.serverPreferences?.readTheRulesConsentEnabled ?? false,
		"Bot Time In Server In Ms": args.guild.joinedAt
			? Date.now() - args.guild.joinedAt.getTime()
			: 0,
	};
}

export function channelWithDiscordInfoToAnalyticsData(args: {
	answerOverflowChannel: ChannelWithSettings;
	discordChannel: Channel;
}): ChannelPropsWithDiscordData {
	const flags = args.answerOverflowChannel.flags;
	return {
		"Channel Id": String(args.answerOverflowChannel.id),
		"Channel Name": args.answerOverflowChannel.name,
		"Channel Type": args.answerOverflowChannel.type,
		"Channel Server Id": String(args.answerOverflowChannel.serverId),
		"Channel Invite Code": flags?.inviteCode ?? undefined,
		"Channel Solution Tag Id": flags?.solutionTagId
			? String(flags.solutionTagId)
			: undefined,
		"Indexing Enabled": flags?.indexingEnabled ?? false,
		"Mark Solution Enabled": flags?.markSolutionEnabled ?? false,
		"Send Mark Solution Instructions In New Threads Enabled":
			flags?.sendMarkSolutionInstructionsInNewThreads ?? false,
		"Auto Thread Enabled": flags?.autoThreadEnabled ?? false,
		"Forum Guidelines Consent Enabled":
			flags?.forumGuidelinesConsentEnabled ?? false,
	};
}

export function threadWithDiscordInfoToAnalyticsData(args: {
	thread: ThreadChannel;
}): ThreadProps {
	return {
		"Thread Id": args.thread.id,
		"Thread Name": args.thread.name,
		"Thread Type": args.thread.type,
		"Number of Messages": args.thread.messageCount ?? 0,
		"Thread Archived Timestamp": args.thread.archivedAt?.getTime() ?? 0,
		"Thread Parent Id": args.thread.parentId ?? undefined,
		"Thread Parent Name": args.thread.parent?.name ?? undefined,
		"Thread Parent Type": args.thread.parent?.type ?? undefined,
	};
}
