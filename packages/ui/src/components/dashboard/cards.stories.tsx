import type { Story, StoryDefault } from '@ladle/react';
import {
	PageViewsCardRenderer,
	CurrentPlanCard,
	PageViewChartRenderer,
} from './cards';

export default {
	title: 'Dashboard / Cards',
} satisfies StoryDefault;
export const PageViewsCard: Story = () => (
	<PageViewsCardRenderer numberOfPageViews={30} status="success" />
);

export const FreePlan: Story = () => (
	<CurrentPlanCard
		server={{
			id: '1',
			plan: 'FREE',
		}}
		dateCancelationTakesEffect={null}
		dateSubscriptionRenews={null}
		dateTrialEnds={null}
		stripeUrl={null}
	/>
);

export const ProPlan: Story = () => (
	<CurrentPlanCard
		server={{
			id: '1',
			plan: 'PRO',
		}}
		dateCancelationTakesEffect={new Date().getTime() / 1000}
		dateSubscriptionRenews={null}
		dateTrialEnds={null}
		stripeUrl={'/'}
	/>
);

export const OpenSourcePlan: Story = () => (
	<CurrentPlanCard
		server={{
			id: '1',
			plan: 'OPEN_SOURCE',
		}}
		dateCancelationTakesEffect={null}
		dateSubscriptionRenews={null}
		dateTrialEnds={null}
		stripeUrl={'/'}
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
