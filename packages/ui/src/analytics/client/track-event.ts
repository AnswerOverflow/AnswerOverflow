import type { PostHog } from "posthog-js";
import {
	channelToAnalyticsData,
	messageToAnalyticsData,
	serverToAnalyticsData,
	threadToAnalyticsData,
} from "./helpers";
import type { EventMap, EventName } from "./types";

type EventProps = EventMap[EventName];

function enrichProps(props: EventProps): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	if ("server" in props && props.server) {
		Object.assign(result, serverToAnalyticsData(props.server));
	}
	if ("channel" in props && props.channel) {
		Object.assign(result, channelToAnalyticsData(props.channel));
	}
	if ("thread" in props && props.thread) {
		Object.assign(result, threadToAnalyticsData(props.thread));
	}
	if ("message" in props && props.message) {
		Object.assign(result, messageToAnalyticsData(props.message));
	}
	if ("solutionAuthorId" in props && props.solutionAuthorId) {
		result["Solution Author Id"] = props.solutionAuthorId.toString();
	}
	if ("feedback" in props) {
		result.feedback = props.feedback;
	}
	if ("Button Location" in props) {
		result["Button Location"] = props["Button Location"];
	}
	if ("Link Location" in props) {
		result["Link Location"] = props["Link Location"];
	}

	return result;
}

export function trackEvent<K extends EventName>(
	eventName: K,
	props: EventMap[K],
	posthog: PostHog | null,
): void {
	if (!posthog) {
		return;
	}

	const enrichedProps = enrichProps(props);
	posthog.capture(eventName, {
		...enrichedProps,
		"Is Server": false,
	});
}
