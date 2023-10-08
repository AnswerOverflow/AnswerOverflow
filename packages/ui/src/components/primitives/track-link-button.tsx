'use client';
import { EventMap, trackEvent } from '@answeroverflow/hooks';
import { LinkButton } from '~ui/components/primitives/base/LinkButton';

export function TrackLinkButton<K extends keyof EventMap | string>(
	props: React.ComponentPropsWithoutRef<typeof LinkButton> & {
		eventName: K;
		eventData: K extends keyof EventMap ? EventMap[K] : Record<string, unknown>;
	},
) {
	return (
		<LinkButton
			onMouseUp={() => {
				trackEvent(props.eventName, props.eventData);
			}}
			{...props}
		/>
	);
}
