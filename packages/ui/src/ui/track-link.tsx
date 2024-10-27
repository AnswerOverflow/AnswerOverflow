'use client';
import { trackEvent } from '../hooks/events';
import { EventMap } from '../hooks/events';
import { Link } from './link';

export function TrackLink<K extends keyof EventMap | string>(
	props: React.ComponentPropsWithoutRef<typeof Link> & {
		eventName: K;
		eventData: K extends keyof EventMap ? EventMap[K] : Record<string, unknown>;
	},
) {
	const { eventName, eventData, ...rest } = props;
	return (
		<Link
			onMouseUp={() => {
				trackEvent(eventName, eventData);
			}}
			{...rest}
		/>
	);
}
