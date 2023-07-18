import type { Plan } from '@answeroverflow/db';
import React from 'react';
import { PricingDialog } from '~ui/components/pages';

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
	proPlanCheckoutUrl: string | null;
	enterprisePlanCheckoutUrl: string | null;
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
					<div className="flex flex-row items-center justify-between space-y-2 rounded-b-lg border border-stone-200 bg-stone-50 p-3 dark:bg-stone-900 sm:space-y-0 sm:px-10">
						<span>
							You must be on the pro plan or higher to use this feature.
						</span>
						{props.proPlanCheckoutUrl && props.enterprisePlanCheckoutUrl && (
							<PricingDialog
								proPlanCheckoutUrl={props.proPlanCheckoutUrl}
								enterprisePlanCheckoutUrl={props.enterprisePlanCheckoutUrl}
							/>
						)}
					</div>
				</div>
			)}
		</TierAccessContext.Provider>
	);
}
