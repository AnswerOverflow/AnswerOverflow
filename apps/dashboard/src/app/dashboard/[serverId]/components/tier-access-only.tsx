import type { Plan } from '@answeroverflow/db';
import React from 'react';
import { PricingDialog } from '@answeroverflow/ui/src/pricing';

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
	hasSubscribedBefore: boolean;
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
					<div className="flex flex-row items-center justify-between space-y-2 rounded-b-lg border bg-muted/20 p-3 sm:space-y-0 sm:px-10">
						<span>
							You must be on the enterprise platform for this feature.
						</span>
						{props.proPlanCheckoutUrl && props.enterprisePlanCheckoutUrl && (
							<PricingDialog
								proPlanCheckoutUrl={props.proPlanCheckoutUrl}
								enterprisePlanCheckoutUrl={props.enterprisePlanCheckoutUrl}
								hasSubscribedBefore={props.hasSubscribedBefore}
							/>
						)}
					</div>
				</div>
			)}
		</TierAccessContext.Provider>
	);
}
