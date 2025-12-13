"use client";

import {
	type EventMap,
	type EventName,
	trackEvent,
	usePostHog,
} from "../analytics/client";
import { LinkButton } from "./link-button";

export function TrackLinkButton<K extends EventName>(
	props: React.ComponentPropsWithoutRef<typeof LinkButton> & {
		eventName: K;
		eventData: EventMap[K];
	},
) {
	const { eventName, eventData, ...rest } = props;
	const posthog = usePostHog();
	return (
		<LinkButton
			onMouseUp={() => {
				trackEvent(eventName, eventData, posthog);
			}}
			{...rest}
		/>
	);
}
