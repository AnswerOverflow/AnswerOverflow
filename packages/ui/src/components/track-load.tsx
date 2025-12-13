"use client";

import {
	type EventMap,
	type EventName,
	useTrackEvent,
} from "../analytics/client";

export function TrackLoad<K extends EventName>(props: {
	eventName: K;
	eventData: EventMap[K];
	runOnce?: boolean;
}) {
	useTrackEvent(props.eventName, props.eventData, {
		runOnce: props.runOnce ?? true,
	});

	return null;
}
