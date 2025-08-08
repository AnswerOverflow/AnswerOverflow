'use client';

import { trackEvent } from '../hooks/events';
import { EventMap } from '../hooks/events';
import { LinkButton } from './link-button';
import { usePostHog } from '../hooks/use-posthog';

export function TrackLinkButton<K extends keyof EventMap | string>(
	props: React.ComponentPropsWithoutRef<typeof LinkButton> & {
		eventName: K;
		eventData: K extends keyof EventMap ? EventMap[K] : Record<string, unknown>;
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
