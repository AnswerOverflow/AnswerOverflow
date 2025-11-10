'use client';
import dynamic from 'next/dynamic';
import React from 'react';
import { trackEvent } from '../../hooks/events';
import { usePostHog } from '../../hooks/use-posthog';
import { Button } from '../../ui/button';

// eslint-disable-next-line @typescript-eslint/naming-convention
const InviteToAnswerOverflowPopover = dynamic(
	() =>
		import('./invite-to-answer-overflow-popover').then(
			(mod) => mod.PopoverDemo,
		),
	{
		loading: () => (
			<Button variant="secondary" disabled>
				Invite a server
			</Button>
		),
		ssr: false,
	},
);

export function LazyInviteToAnswerOverflowPopover() {
	const [shouldShow, setShouldShow] = React.useState(false);
	const posthog = usePostHog();
	if (shouldShow) return <InviteToAnswerOverflowPopover defaultOpen={true} />;
	return (
		<Button
			onClick={() => {
				trackEvent(
					'Invite to Join Answer Overflow From Message Result Page',
					{},
					posthog,
				);
				setShouldShow(true);
			}}
			onMouseEnter={() => {
				// preload on hover
				import('./invite-to-answer-overflow-popover');
			}}
			variant="outline"
		>
			Invite a server
		</Button>
	);
}
