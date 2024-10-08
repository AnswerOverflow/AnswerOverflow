import { Plan } from '@answeroverflow/core/schema';
import { PricingDialog } from '@answeroverflow/ui/pricing';
import { BlueLink } from '@answeroverflow/ui/ui/blue-link';
import { useDashboardContext } from '../components/dashboard-context';
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from '@answeroverflow/ui/ui/card';

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
		<Card className="h-full w-full">
			<CardHeader>
				<CardTitle>Current plan</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-1">
				<span className="text-2xl font-semibold">{planToPrettyText(plan)}</span>
				<span>{`${label} ${
					dateInMs ? new Date(dateInMs * 1000).toLocaleDateString() : ''
				}`}</span>
			</CardContent>
			<CardFooter>
				<CTA />
			</CardFooter>
		</Card>
	);
}
