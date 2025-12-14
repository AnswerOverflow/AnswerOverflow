"use client";

import {
	type EventMap,
	type EventName,
	trackEvent,
	usePostHog,
} from "../analytics/client";
import { Link } from "./link";

export function TrackLink<K extends EventName>(
	props: React.ComponentPropsWithoutRef<typeof Link> & {
		eventName: K;
		eventData: EventMap[K];
	},
) {
	const { eventName, eventData, ...rest } = props;
	const posthog = usePostHog();
	return (
		<Link
			onMouseUp={() => {
				trackEvent(eventName, eventData, posthog);
			}}
			{...rest}
		/>
	);
}
