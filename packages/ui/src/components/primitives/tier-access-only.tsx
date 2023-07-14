import type { Plan } from '@answeroverflow/db';
import React from 'react';
import { Button } from '~ui/components/primitives';

// eslint-disable-next-line @typescript-eslint/naming-convention
const TierAccessContext = React.createContext<{
	currentPlan: Plan;
	enabledFor: Plan[];
	enabled: boolean;
} | null>(null);

export const useTierAccess = () => {
	const context = React.useContext(TierAccessContext);
	if (!context) {
		throw new Error('useTierAccess must be used within a TierAccessProvider');
	}
	return context;
};

export function TierAccessOnly(props: {
	children: React.ReactNode;
	cta?: React.ReactNode;
	enabledFor: Plan[];
	currentPlan: Plan;
}) {
	const enabled = props.enabledFor.includes(props.currentPlan);
	return (
		<TierAccessContext.Provider
			value={{
				enabled,
				enabledFor: props.enabledFor,
				currentPlan: props.currentPlan,
			}}
		>
			{enabled ? (
				props.children
			) : (
				<div className="grid grid-cols-1 grid-rows-1">
					<div className="cursor-not-allowed opacity-50">{props.children}</div>
					{props.cta ? (
						props.cta
					) : (
						<div className="flex flex-row items-center justify-between space-y-2 rounded-b-lg border border-stone-200 bg-stone-50 p-3 dark:bg-stone-900 sm:space-y-0 sm:px-10">
							<span>You must be on the pro plan to use this feature.</span>
							<Button variant="outline" disabled>
								Pro Tier Avaliable Starting 7/24
							</Button>
							{/* TODO: Change to start free trial for better conversion? */}
						</div>
					)}
				</div>
			)}
		</TierAccessContext.Provider>
	);
}
