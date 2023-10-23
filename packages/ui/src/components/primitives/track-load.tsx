'use client';
import { EventMap } from '@answeroverflow/hooks';
import { useTrackEvent } from '@answeroverflow/hooks/src/analytics/client';

export function TrackLoad<K extends keyof EventMap | string>(props: {
	eventName: K;
	eventData: K extends keyof EventMap ? EventMap[K] : Record<string, unknown>;
	runOnce?: boolean;
}) {
	useTrackEvent(props.eventName, props.eventData, {
		runOnce: props.runOnce,
	});
	return <></>;
}
