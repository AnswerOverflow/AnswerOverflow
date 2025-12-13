"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import type { ReactNode } from "react";

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_TOKEN) {
	posthog.init(process.env.NEXT_PUBLIC_POSTHOG_TOKEN, {
		api_host: `/api/${process.env.NEXT_PUBLIC_ANALYTICS_PATH ?? "a"}`,
		ui_host: "https://us.i.posthog.com",
		disable_session_recording: true,
		persistence: "memory",
		capture_pageview: false,
	});
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
	if (!process.env.NEXT_PUBLIC_POSTHOG_TOKEN) {
		return <>{children}</>;
	}
	return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
