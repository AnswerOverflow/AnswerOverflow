import type { PostHog } from "posthog-js";
import type {
	ClientEvents,
	ClientEventName,
} from "@packages/database/analytics/events/client";
import type {
	AnalyticsServer,
	AnalyticsChannel,
	AnalyticsThread,
	AnalyticsMessage,
} from "@packages/database/analytics/types";
import {
	flattenServer,
	flattenChannel,
	flattenThread,
	flattenMessage,
} from "@packages/database/analytics/flatten";
import type { EventMap, EventName } from "./types";
import type {
	AnalyticsServer as OldAnalyticsServer,
	AnalyticsChannel as OldAnalyticsChannel,
	AnalyticsThread as OldAnalyticsThread,
	AnalyticsMessage as OldAnalyticsMessage,
} from "./types";

function convertOldServerToNew(server: OldAnalyticsServer): AnalyticsServer {
	return {
		id: server.discordId.toString(),
		name: server.name,
	};
}

function convertOldChannelToNew(
	channel: OldAnalyticsChannel,
): AnalyticsChannel {
	return {
		id: channel.id.toString(),
		name: channel.name,
		type: channel.type,
		serverId: channel.serverId?.toString(),
		inviteCode: channel.inviteCode,
	};
}

function convertOldThreadToNew(thread: OldAnalyticsThread): AnalyticsThread {
	return {
		id: thread.id.toString(),
		name: thread.name,
		type: thread.type,
		archivedTimestamp: thread.archivedAt?.getTime(),
		parentId: thread.parentId?.toString(),
		parentName: thread.parentName ?? undefined,
		parentType: thread.parentType ?? undefined,
		messageCount: thread.messageCount ?? undefined,
	};
}

function convertOldMessageToNew(
	message: OldAnalyticsMessage,
): AnalyticsMessage {
	return {
		id: message.id.toString(),
		authorId: message.authorId.toString(),
		serverId: message.serverId.toString(),
		channelId: message.channelId.toString(),
		threadId: message.threadId?.toString(),
	};
}

function track<K extends ClientEventName>(
	event: K,
	props: ClientEvents[K],
	posthog: PostHog | null,
): void {
	if (!posthog) return;

	const flat: Record<string, unknown> = {};

	if ("server" in props && props.server) {
		Object.assign(flat, flattenServer(props.server));
	}
	if ("channel" in props && props.channel) {
		Object.assign(flat, flattenChannel(props.channel));
	}
	if ("thread" in props && props.thread) {
		Object.assign(flat, flattenThread(props.thread));
	}
	if ("message" in props && props.message) {
		Object.assign(flat, flattenMessage(props.message));
	}

	if ("solutionAuthorId" in props && props.solutionAuthorId) {
		flat["Solution Author Id"] = props.solutionAuthorId;
	}
	if ("feedback" in props) {
		flat.feedback = props.feedback;
	}
	if ("url" in props) {
		flat.url = props.url;
	}
	if ("provider" in props) {
		flat.provider = props.provider;
	}
	if ("Button Location" in props) {
		flat["Button Location"] = props["Button Location"];
	}
	if ("Link Location" in props) {
		flat["Link Location"] = props["Link Location"];
	}

	posthog.capture(event, { ...flat, "Is Server": false });
}

function trackEventLegacy<K extends EventName>(
	eventName: K,
	props: EventMap[K],
	posthog: PostHog | null,
): void {
	if (!posthog) return;

	const flat: Record<string, unknown> = {};

	if ("server" in props && props.server) {
		Object.assign(flat, flattenServer(convertOldServerToNew(props.server)));
	}
	if ("channel" in props && props.channel) {
		Object.assign(flat, flattenChannel(convertOldChannelToNew(props.channel)));
	}
	if ("thread" in props && props.thread) {
		Object.assign(flat, flattenThread(convertOldThreadToNew(props.thread)));
	}
	if ("message" in props && props.message) {
		Object.assign(flat, flattenMessage(convertOldMessageToNew(props.message)));
	}

	if ("solutionAuthorId" in props && props.solutionAuthorId) {
		flat["Solution Author Id"] = props.solutionAuthorId.toString();
	}
	if ("feedback" in props) {
		flat.feedback = props.feedback;
	}
	if ("url" in props) {
		flat.url = props.url;
	}
	if ("provider" in props) {
		flat.provider = props.provider;
	}
	if ("Button Location" in props) {
		flat["Button Location"] = props["Button Location"];
	}
	if ("Link Location" in props) {
		flat["Link Location"] = props["Link Location"];
	}

	posthog.capture(eventName, { ...flat, "Is Server": false });
}

export { track };
export const trackEvent = trackEventLegacy;
