import type { Story, StoryDefault } from '@ladle/react';
import {
	PageViewsCardRenderer,
	PageViewChartRenderer,
	CurrentPlanCardRenderer,
} from './cards';

export default {
	title: 'Dashboard / Cards',
} satisfies StoryDefault;

export const FreePlan: Story = () => (
	<CurrentPlanCardRenderer
		dateCancelationTakesEffect={null}
		dateSubscriptionRenews={null}
		dateTrialEnds={null}
		stripeCheckoutUrl={null}
		status={'active'}
		plan="FREE"
	/>
);

export const ProPlan: Story = () => (
	<CurrentPlanCardRenderer
		dateCancelationTakesEffect={new Date().getTime() / 1000}
		dateSubscriptionRenews={null}
		dateTrialEnds={null}
		stripeCheckoutUrl={'/'}
		status={'active'}
		plan="PRO"
	/>
);

export const OpenSourcePlan: Story = () => (
	<CurrentPlanCardRenderer
		plan="OPEN_SOURCE"
		dateCancelationTakesEffect={null}
		dateSubscriptionRenews={null}
		dateTrialEnds={null}
		status={'active'}
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

export const FreePageViewsCard = () => (
	<PageViewsCardRenderer
		status={'success'}
		plan={'FREE'}
		numberOfPageViews={34000}
	/>
);

export const ProPageViewsCard = () => (
	<PageViewsCardRenderer
		status={'success'}
		plan={'PRO'}
		numberOfPageViews={82340}
	/>
);

export const OpenSourcePageViewsCard = () => (
	<PageViewsCardRenderer
		status={'success'}
		plan={'OPEN_SOURCE'}
		numberOfPageViews={50103123}
	/>
);

export const EnterprisePageViewsCard = () => (
	<PageViewsCardRenderer
		status={'success'}
		plan={'ENTERPRISE'}
		numberOfPageViews={341233}
	/>
);
