'use client';
import React, { useEffect, useRef } from 'react';
import type { Session } from 'next-auth';
import posthog from 'posthog-js';
import { EventMap, trackEvent } from './events';
import { PostHogProvider } from 'posthog-js/react';
import { usePathname, useSearchParams } from 'next/navigation';

export function PostHogPageview() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	// Track pageviews
	useEffect(() => {
		if (pathname) {
			let url = window.origin + pathname;
			if (searchParams?.toString()) {
				url = url + `?${searchParams.toString()}`;
			}
			posthog.capture('$pageview', {
				$current_url: url,
			});
		}
	}, [pathname, searchParams]);
	return <></>;
}

export const AnalyticsProvider = ({
	children,
	session,
}: {
	children: React.ReactNode;
	session?: Session | null;
}) => {
	useEffect(() => {
		// eslint-disable-next-line n/no-process-env
		posthog.init(process.env.NEXT_PUBLIC_POSTHOG_TOKEN!, {
			disable_session_recording: true,
			persistence: 'memory',
			capture_pageview: false,
			bootstrap: {
				distinctID: session?.user?.id,
			},
		});
	}, [session?.user?.id]);
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
		const options = opts || {};
		const enabled = opts?.enabled ?? true;
		if (!enabled) return;
		if (!hasSentAnalyticsEvent.current) {
			trackEvent(eventName, props);
			if (options.runOnce) {
				hasSentAnalyticsEvent.current = true;
			}
		}
	}, [hasSentAnalyticsEvent, eventName, props, opts]);
}
