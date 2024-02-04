import { sharedEnvs } from '@answeroverflow/env/shared';
import { PostHog } from 'posthog-node';

const apiKey = sharedEnvs.NEXT_PUBLIC_POSTHOG_TOKEN;
const shouldCollectAnalytics =
	apiKey !== undefined && sharedEnvs.NODE_ENV !== 'test';

const posthog = shouldCollectAnalytics ? new PostHog(apiKey) : undefined;

export async function isFeatureEnabled(name: 'enable-ads-on-post-page') {
	if (!posthog) return false;
	return posthog?.isFeatureEnabled(name, 'server');
}
