// straight up postin' my hog

import { usePostHog as usePostHogInternal } from 'posthog-js/react';
import { useTenant } from '../context/tenant-context';

export type CustomHog = ReturnType<typeof usePostHogInternal> & {
	__brand: 'CustomHog';
};

export function usePostHog() {
	const tenant = useTenant();
	const posthog = usePostHogInternal();
	posthog.set_config({
		api_host: tenant?.subpath ? `/${tenant.subpath}/ingest` : '/ingest',
	});
	return posthog as CustomHog;
}
