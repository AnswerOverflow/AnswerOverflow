'use client';
import Link from 'next/link';
import { EventMap, trackEvent } from '@answeroverflow/hooks';

export function TrackLink<K extends keyof EventMap | string>(
	props: React.ComponentPropsWithoutRef<typeof Link> & {
		eventName: K;
		eventData: K extends keyof EventMap ? EventMap[K] : Record<string, unknown>;
	},
) {
	return (
		<Link
			onMouseUp={() => {
				trackEvent(props.eventName, props.eventData);
			}}
			{...props}
		/>
	);
}
