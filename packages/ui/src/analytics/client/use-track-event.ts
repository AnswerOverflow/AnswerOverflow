"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "./track-event";
import type { EventMap, EventName } from "./types";
import { usePostHog } from "./use-posthog";

export function useTrackEvent<K extends EventName>(
	eventName: K,
	props: EventMap[K],
	opts?: {
		runOnce?: boolean;
		enabled?: boolean;
	},
): void {
	const hasSentEvent = useRef(false);
	const posthog = usePostHog();

	useEffect(() => {
		const enabled = opts?.enabled ?? true;
		const runOnce = opts?.runOnce ?? true;

		if (!enabled || !posthog) {
			return;
		}
		if (runOnce && hasSentEvent.current) {
			return;
		}

		trackEvent(eventName, props, posthog);
		hasSentEvent.current = true;
	}, [eventName, props, opts, posthog]);
}
