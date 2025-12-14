import type {
	Channel,
	Guild,
	GuildMember,
	Message,
	PartialGuildMember,
	ThreadChannel,
} from "discord.js";
import { Effect } from "effect";
import { PostHogCaptureClient } from "./capture-client";
import {
	channelWithDiscordInfoToAnalyticsData as convertChannel,
	serverWithDiscordInfoToAnalyticsData as convertServer,
	threadWithDiscordInfoToAnalyticsData as convertThread,
} from "./discord-helpers";
import type { BaseProps } from "./types";

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

type MemberWithPrefix = {
	prefix: string;
	member: GuildMember | PartialGuildMember;
};

type MessageWithPrefix = {
	prefix: string;
	message: Message;
};

type PropsWithDiscordObjects = BaseProps & {
	guild?: Guild;
	serverWithSettings?: ServerWithSettings;
	serverPreferences?: ServerPreferences;
	channel?: Channel;
	channelWithSettings?: ChannelWithSettings;
	thread?: ThreadChannel;
	members?: MemberWithPrefix[];
	messages?: MessageWithPrefix[];
};

function memberToUserProps(
	prefix: string,
	member: GuildMember | PartialGuildMember,
) {
	return {
		[`${prefix} Id`]: member.id,
		[`${prefix} Joined At`]: member.joinedAt?.getTime(),
		[`${prefix} Time In Server In Ms`]:
			member.joinedAt?.getTime() && Date.now() - member.joinedAt.getTime(),
	};
}

function messageToProps(prefix: string, message: Message) {
	return {
		[`${prefix} Id`]: message.id,
		[`${prefix} Created At`]: message.createdTimestamp,
		[`${prefix} Content Length`]: message.content.length,
		[`${prefix} Server Id`]: message.guild?.id,
		[`${prefix} Channel Id`]: message.channel.isThread()
			? message.channel.parentId
			: message.channel.id,
		[`${prefix} Thread Id`]: message.channel.isThread()
			? message.channel.id
			: undefined,
	};
}

function enrichProps(props: PropsWithDiscordObjects): BaseProps {
	const enriched: BaseProps & Record<string, unknown> = {
		...props,
	};

	if (props.guild) {
		const serverProps = convertServer({
			guild: props.guild,
			serverWithSettings: props.serverWithSettings ?? {
				discordId: props.guild.id,
				name: props.guild.name,
			},
			serverPreferences: props.serverPreferences,
		});
		Object.assign(enriched, serverProps);
	}

	if (props.channel && props.channelWithSettings) {
		const channelProps = convertChannel({
			answerOverflowChannel: props.channelWithSettings,
			discordChannel: props.channel,
		});
		Object.assign(enriched, channelProps);
	}

	if (props.thread) {
		const threadProps = convertThread({
			thread: props.thread,
		});
		Object.assign(enriched, threadProps);
	}

	if (props.members) {
		for (const { prefix, member } of props.members) {
			Object.assign(enriched, memberToUserProps(prefix, member));
		}
	}

	if (props.messages) {
		for (const { prefix, message } of props.messages) {
			Object.assign(enriched, messageToProps(prefix, message));
		}
	}

	delete enriched.guild;
	delete enriched.serverWithSettings;
	delete enriched.serverPreferences;
	delete enriched.channel;
	delete enriched.channelWithSettings;
	delete enriched.thread;
	delete enriched.members;
	delete enriched.messages;

	return enriched as BaseProps;
}

export function trackEvent<K extends BaseProps>(
	eventName: string,
	props: K | (() => Promise<K>),
): Effect.Effect<void, never, PostHogCaptureClient> {
	return Effect.gen(function* () {
		const posthog = yield* PostHogCaptureClient;
		if (!posthog) {
			console.warn(
				`[Analytics] PostHog client not initialized, skipping event: ${eventName}`,
			);
			return;
		}

		const resolvedProps =
			typeof props === "function" ? yield* Effect.promise(props) : props;

		const enrichedProps = enrichProps(resolvedProps as PropsWithDiscordObjects);

		const { "Answer Overflow Account Id": aoId } = enrichedProps;
		if (!aoId) {
			console.error(
				`[Analytics] Missing "Answer Overflow Account Id" for event "${eventName}". Props:`,
				Object.keys(enrichedProps),
			);
			return;
		}
		const captureData: Parameters<typeof posthog.capture>[0] = {
			event: eventName,
			distinctId: aoId,
			properties: enrichedProps,
		};

		const serverId =
			"Server Id" in enrichedProps ? enrichedProps["Server Id"] : undefined;
		if (
			(serverId !== undefined && typeof serverId === "string") ||
			typeof serverId === "number"
		) {
			captureData.groups = {
				server: String(serverId),
			};
		}

		yield* Effect.sync(() => {
			posthog.capture(captureData);
		});
	}).pipe(
		Effect.catchAll((error) =>
			Effect.sync(() => {
				console.error(
					`[Analytics] Failed to track event "${eventName}":`,
					error,
				);
			}),
		),
	);
}

export function registerServerGroup(props: {
	"Server Id": string;
	[key: string]: unknown;
}): Effect.Effect<void, never, PostHogCaptureClient> {
	return Effect.gen(function* () {
		const posthog = yield* PostHogCaptureClient;
		if (!posthog) {
			console.warn(
				`[Analytics] PostHog client not initialized, skipping server group registration`,
			);
			return;
		}
		yield* Effect.sync(() => {
			posthog.groupIdentify({
				groupType: "server",
				groupKey: props["Server Id"],
				properties: props,
			});
		});
	}).pipe(
		Effect.catchAll((error) =>
			Effect.sync(() => {
				console.error(`[Analytics] Failed to register server group:`, error);
			}),
		),
	);
}
