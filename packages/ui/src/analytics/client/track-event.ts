import type {
	ClientEventName,
	ClientEvents,
} from "@packages/database/analytics/events/client";

import {
	flattenChannel,
	flattenMessage,
	flattenServer,
	flattenThread,
} from "@packages/database/analytics/flatten";
import type {
	AnalyticsChannel,
	AnalyticsMessage,
	AnalyticsServer,
	AnalyticsThread,
} from "@packages/database/analytics/types";
import type { PostHog } from "posthog-js";

type MaybeBaseProps = {
	server?: AnalyticsServer | null;
	channel?: AnalyticsChannel | null;
	thread?: AnalyticsThread | null;
	message?: AnalyticsMessage | null;
};

const BASE_KEYS = new Set(["server", "channel", "thread", "message"]);

function track<K extends ClientEventName>(
	event: K,
	props: ClientEvents[K],
	posthog: PostHog | null,
): void {
	if (!posthog) return;

	const flat: Record<string, unknown> = {};
	const p = props as MaybeBaseProps;

	if (p.server) {
		Object.assign(flat, flattenServer(p.server));
	}
	if (p.channel) {
		Object.assign(flat, flattenChannel(p.channel));
	}
	if (p.thread) {
		Object.assign(flat, flattenThread(p.thread));
	}
	if (p.message) {
		Object.assign(flat, flattenMessage(p.message));
	}

	for (const [key, value] of Object.entries(props)) {
		if (!BASE_KEYS.has(key) && value !== undefined) {
			flat[key] = value;
		}
	}

	posthog.capture(event, { ...flat, "Is Server": false });
}

export { track };
export const trackEvent = track;
