import { StoryDefault, Story } from '@ladle/react';
import { PageViewsCardRenderer } from './cards';
import { ServerDashboardRenderer } from './dashboard';
import { mockPublicServer, mockServer } from '~ui/test/props';

export default {
	title: 'Dashboard / Dashboards',
} satisfies StoryDefault;

export const FreeDashboardStory: Story = () => (
	<ServerDashboardRenderer
		data={{
			...mockServer(),
			dateCancelationTakesEffect: null,
			dateSubscriptionRenews: null,
			stripeCheckoutUrl: null,
			dateTrialEnds: null,
			bitfield: 0,
		}}
	/>
);

export const ProDashboardStory: Story = () => (
	<ServerDashboardRenderer
		data={{
			...mockServer({
				plan: 'PRO',
			}),
			dateCancelationTakesEffect: null,
			dateSubscriptionRenews: null,
			stripeCheckoutUrl: null,
			dateTrialEnds: null,
			bitfield: 0,
		}}
	/>
);

export const OpenSourceDashboardStory: Story = () => (
	<ServerDashboardRenderer
		data={{
			...mockServer({
				plan: 'OPEN_SOURCE',
			}),
			dateCancelationTakesEffect: null,
			dateSubscriptionRenews: null,
			stripeCheckoutUrl: null,
			dateTrialEnds: null,
			bitfield: 0,
		}}
	/>
);
