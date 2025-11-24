// todo move this into discord bot
import type { Channel, Guild, ThreadChannel } from "discord.js";
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
	id: string;
	name: string;
	type: number;
	serverId: string;
	inviteCode?: string;
	solutionTagId?: string;
	flags: {
		indexingEnabled: boolean;
		markSolutionEnabled: boolean;
		sendMarkSolutionInstructionsInNewThreads: boolean;
		autoThreadEnabled: boolean;
		forumGuidelinesConsentEnabled: boolean;
	};
};

type ServerPreferences = {
	readTheRulesConsentEnabled?: boolean;
};

type PropsWithDiscordObjects = BaseProps & {
	guild?: Guild;
	serverWithSettings?: ServerWithSettings;
	serverPreferences?: ServerPreferences;
	channel?: Channel;
	channelWithSettings?: ChannelWithSettings;
	thread?: ThreadChannel;
};

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

	delete enriched.guild;
	delete enriched.serverWithSettings;
	delete enriched.serverPreferences;
	delete enriched.channel;
	delete enriched.channelWithSettings;
	delete enriched.thread;

	return enriched as BaseProps;
}

export function trackEvent<K extends BaseProps>(
	eventName: string,
	props: K | (() => Promise<K>),
): Effect.Effect<void, never, PostHogCaptureClient> {
	return Effect.gen(function* () {
		const posthog = yield* PostHogCaptureClient;
		if (!posthog) {
			return;
		}

		const resolvedProps =
			typeof props === "function" ? yield* Effect.promise(props) : props;

		const enrichedProps = enrichProps(resolvedProps as PropsWithDiscordObjects);

		const { "Answer Overflow Account Id": aoId } = enrichedProps;
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
	}).pipe(Effect.catchAll(() => Effect.void));
}

export function registerServerGroup(props: {
	"Server Id": string;
	[key: string]: unknown;
}): Effect.Effect<void, never, PostHogCaptureClient> {
	return Effect.gen(function* () {
		const posthog = yield* PostHogCaptureClient;
		if (!posthog) {
			return;
		}
		yield* Effect.sync(() => {
			posthog.groupIdentify({
				groupType: "server",
				groupKey: props["Server Id"],
				properties: props,
			});
		});
	}).pipe(Effect.catchAll(() => Effect.void));
}
