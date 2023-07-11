import { StoryDefault, Story } from '@ladle/react';
import { PageViewsCardRenderer } from './cards';
import { ServerDashboardRenderer } from './dashboard';
import { mockServer } from '~ui/test/props';

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
		PageViewsCardOverride={
			<PageViewsCardRenderer status="success" numberOfPageViews={10} />
		}
	/>
);

export const ProDashboardStory: Story = () => (
	<ServerDashboardRenderer
		data={{
			...mockServer({
				plan: 'PRO',
				customDomain: 'support.rhyssullivan.dev',
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
