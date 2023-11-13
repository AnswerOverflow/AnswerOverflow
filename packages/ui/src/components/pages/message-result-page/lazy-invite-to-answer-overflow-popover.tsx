'use client';
import dynamic from 'next/dynamic';
import { Button } from '../../primitives/ui/button';
import React from 'react';
import { trackEvent } from '@answeroverflow/hooks';

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
	if (shouldShow) return <InviteToAnswerOverflowPopover defaultOpen={true} />;
	return (
		<Button
			onClick={() => {
				trackEvent(
					'Invite to Join Answer Overflow From Message Result Page',
					{},
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
