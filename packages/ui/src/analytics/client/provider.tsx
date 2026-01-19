"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import type { ReactNode } from "react";

const analyticsPath = process.env.NEXT_PUBLIC_ANALYTICS_PATH ?? "a";

function getApiHost(subpath: string | null | undefined): string {
	if (subpath) {
		return `/${subpath}/api/${analyticsPath}`;
	}
	return `/api/${analyticsPath}`;
}

let posthogInitialized = false;

function initPostHog(subpath: string | null | undefined) {
	if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_POSTHOG_TOKEN) {
		return;
	}

	const apiHost = getApiHost(subpath);

	if (!posthogInitialized) {
		posthog.init(process.env.NEXT_PUBLIC_POSTHOG_TOKEN, {
			api_host: apiHost,
			ui_host: "https://us.i.posthog.com",
			disable_session_recording: true,
			persistence: "memory",
			capture_pageview: false,
		});
		posthogInitialized = true;
	}
}

export function AnalyticsProvider({
	children,
	subpath,
}: {
	children: ReactNode;
	subpath?: string | null;
}) {
	initPostHog(subpath);

	if (!process.env.NEXT_PUBLIC_POSTHOG_TOKEN) {
		return <>{children}</>;
	}
	return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
