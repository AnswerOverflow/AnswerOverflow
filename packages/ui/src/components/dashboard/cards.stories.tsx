import type { Story, StoryDefault } from '@ladle/react';
import {
	PageViewsCardRenderer,
	PageViewChartRenderer,
	CurrentPlanCardRenderer,
} from './cards';

export default {
	title: 'Dashboard / Cards',
} satisfies StoryDefault;
export const PageViewsCard: Story = () => (
	<PageViewsCardRenderer numberOfPageViews={30} status="success" />
);

export const FreePlan: Story = () => (
	<CurrentPlanCardRenderer
		dateCancelationTakesEffect={null}
		dateSubscriptionRenews={null}
		dateTrialEnds={null}
		stripeCheckoutUrl={null}
		plan="FREE"
	/>
);

export const ProPlan: Story = () => (
	<CurrentPlanCardRenderer
		dateCancelationTakesEffect={new Date().getTime() / 1000}
		dateSubscriptionRenews={null}
		dateTrialEnds={null}
		stripeCheckoutUrl={'/'}
		plan="PRO"
	/>
);

export const OpenSourcePlan: Story = () => (
	<CurrentPlanCardRenderer
		plan="OPEN_SOURCE"
		dateCancelationTakesEffect={null}
		dateSubscriptionRenews={null}
		dateTrialEnds={null}
		stripeCheckoutUrl={null}
	/>
);

export const PageViewsChart = () => (
	<PageViewChartRenderer
		data={[
			{
				'View Count': 0,
				day: 'June 1',
			},
			{
				'View Count': 1,
				day: 'June 2',
			},
			{
				'View Count': 2,
				day: 'June 3',
			},
		]}
		status="success"
	/>
);
