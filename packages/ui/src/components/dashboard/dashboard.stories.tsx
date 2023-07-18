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
			status: 'inactive',
			hasSubscribedBefore: false,
			proPlanCheckoutUrl: '/',
			enterprisePlanCheckoutUrl: '/',
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
			status: 'active',
			dateCancelationTakesEffect: null,
			dateSubscriptionRenews: new Date().getTime() + 1000 * 60 * 60 * 24 * 30,
			stripeCheckoutUrl: '/',
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
			status: 'inactive',
			proPlanCheckoutUrl: '/',
			hasSubscribedBefore: false,
			enterprisePlanCheckoutUrl: '/',
			dateTrialEnds: null,
			bitfield: 0,
		}}
	/>
);
