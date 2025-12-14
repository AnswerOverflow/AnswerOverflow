"use client";

import { usePostHog as usePostHogOriginal } from "posthog-js/react";
import { useTenant } from "../../components/tenant-context";

const analyticsPath = process.env.NEXT_PUBLIC_ANALYTICS_PATH ?? "a";

export function usePostHog() {
	const tenant = useTenant();
	const posthog = usePostHogOriginal();

	if (posthog && tenant?.subpath) {
		posthog.set_config({
			api_host: `/${tenant.subpath}/api/${analyticsPath}`,
		});
	}

	return posthog;
}
