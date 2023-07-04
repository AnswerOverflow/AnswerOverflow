import type { Plan } from '@answeroverflow/db';
import React from 'react';
import { Button } from '~ui/components/primitives';

export function TierAccessOnly(props: {
	children: React.ReactNode;
	cta?: React.ReactNode;
	enabledFor: Plan[];
	currentPlan: Plan;
}) {
	const enabled = props.enabledFor.includes(props.currentPlan);
	if (enabled) {
		return props.children;
	}
	return (
		<div className="grid grid-cols-1 grid-rows-1">
			<div className="cursor-not-allowed opacity-50">{props.children}</div>
			{props.cta ? (
				props.cta
			) : (
				<div className="flex flex-row items-center justify-between space-y-2 rounded-b-lg border border-stone-200 bg-stone-50 p-3 dark:bg-stone-900 sm:space-y-0 sm:px-10">
					<span>You must be on the pro plan to use this feature.</span>
					<Button variant="outline">Enable and Pay</Button>
					{/* TODO: Change to start free trial for better conversion? */}
				</div>
			)}
		</div>
	);
}
