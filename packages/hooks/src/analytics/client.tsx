'use client';
import React, { useEffect, useRef } from 'react';
import { EventMap, trackEvent } from './events';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider, usePostHog } from 'posthog-js/react';

if (typeof window !== 'undefined') {
	// eslint-disable-next-line n/no-process-env
	posthog.init(process.env.NEXT_PUBLIC_POSTHOG_TOKEN!, {
		disable_session_recording: true,
		persistence: 'memory',
		capture_pageview: false,
	});
}

export function PostHogPageview() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const posthog = usePostHog();
	// Track pageviews
	useEffect(() => {
		if (pathname && posthog) {
			let url = window.origin + pathname;
			const asString = searchParams?.toString();
			if (asString) {
				url = url + `?${asString}`;
			}
			posthog.capture('$pageview', {
				$current_url: url,
			});
		}
	}, [pathname, searchParams, posthog]);

	return null;
}

export const AnalyticsProvider = ({
	children,
}: {
	children?: React.ReactNode;
}) => {
	return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
};

export function useTrackEvent<K extends keyof EventMap | string>(
	eventName: K,
	props: K extends keyof EventMap ? EventMap[K] : Record<string, unknown>,
	opts?: {
		runOnce?: boolean;
		enabled?: boolean;
	},
): void {
	const hasSentAnalyticsEvent = useRef(false);
	useEffect(() => {
		const enabled = opts?.enabled ?? true;
		const runOnce = opts?.runOnce ?? true;
		if (!enabled) return;
		if (!hasSentAnalyticsEvent.current) {
			trackEvent(eventName, props);
			if (runOnce) {
				hasSentAnalyticsEvent.current = true;
			}
		}
	}, [hasSentAnalyticsEvent, eventName, props, opts]);
}
