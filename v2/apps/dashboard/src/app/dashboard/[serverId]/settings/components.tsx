import type { Plan } from '@answeroverflow/db';
import { PricingDialog } from '@answeroverflow/ui/src/pricing';
import { BlueLink } from '@answeroverflow/ui/src/ui/blue-link';
import { useDashboardContext } from '../components/dashboard-context';

function planToPrettyText(plan: Plan) {
	switch (plan) {
		case 'FREE':
			return 'Free';
		case 'PRO':
			return 'Pro';
		case 'OPEN_SOURCE':
			return 'Open Source';
		case 'ENTERPRISE':
			return 'Enterprise';
	}
}

export function CurrentPlanCard() {
	const { server } = useDashboardContext();
	const {
		plan,
		status,
		dateCancelationTakesEffect,
		dateTrialEnds,
		proPlanCheckoutUrl,
		hasSubscribedBefore,
		stripeCheckoutUrl,
		enterprisePlanCheckoutUrl,
		dateSubscriptionRenews,
	} = server;
	const dateInMs =
		dateCancelationTakesEffect ??
		dateTrialEnds ??
		dateSubscriptionRenews ??
		null;

	const label = dateCancelationTakesEffect
		? 'Cancelation Takes Effect'
		: dateTrialEnds
			? 'Trial Ends'
			: dateSubscriptionRenews
				? 'Renews'
				: '';

	const CTA = () => {
		if (status === 'inactive') {
			if (
				!proPlanCheckoutUrl ||
				!enterprisePlanCheckoutUrl ||
				plan === 'OPEN_SOURCE'
			) {
				return;
			}
			return (
				<PricingDialog
					proPlanCheckoutUrl={proPlanCheckoutUrl}
					enterprisePlanCheckoutUrl={enterprisePlanCheckoutUrl}
					hasSubscribedBefore={hasSubscribedBefore}
				/>
			);
		} else {
			if (!stripeCheckoutUrl) {
				return;
			}
			return <BlueLink href={stripeCheckoutUrl}>Change Plan</BlueLink>;
		}
	};

	return (
		<div className="flex h-full w-full flex-col justify-between gap-2 rounded-md border-1 p-4 pb-10">
			<div className="flex flex-col gap-1">
				<span className="text-lg font-semibold">Current plan</span>
				<span className="text-2xl font-semibold">{planToPrettyText(plan)}</span>
			</div>
			<div className="flex flex-col gap-1">
				<span>{`${label} ${
					dateInMs ? new Date(dateInMs * 1000).toLocaleDateString() : ''
				}`}</span>

				<CTA />
			</div>
		</div>
	);
}
