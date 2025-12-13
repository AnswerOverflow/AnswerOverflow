"use client";

import { usePostHog as usePostHogOriginal } from "posthog-js/react";
import { useTenant } from "../../components/tenant-context";

export function usePostHog() {
	const tenant = useTenant();
	const posthog = usePostHogOriginal();

	if (posthog && tenant?.subpath) {
		posthog.set_config({
			api_host: `/${tenant.subpath}/ingest`,
		});
	}

	return posthog;
}
