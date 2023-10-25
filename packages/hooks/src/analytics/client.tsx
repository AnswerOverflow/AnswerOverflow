'use client';
import React, { lazy, useEffect, useRef, useState, Suspense } from 'react';
import type { Session } from 'next-auth';
import { EventMap, trackEvent } from './events';
import { usePathname, useSearchParams } from 'next/navigation';

export function PostHogPageview() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	// Track pageviews
	useEffect(() => {
		const track = async () => {
			if (pathname) {
				let url = window.origin + pathname;
				if (searchParams?.toString()) {
					url = url + `?${searchParams.toString()}`;
				}
				const { posthog } = await import('posthog-js');
				posthog.capture('$pageview', {
					$current_url: url,
				});
			}
		};
		void track();
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
		const load = async () => {
			const { posthog } = await import('posthog-js');
			// eslint-disable-next-line n/no-process-env
			posthog.init(process.env.NEXT_PUBLIC_POSTHOG_TOKEN!, {
				disable_session_recording: true,
				persistence: 'memory',
				capture_pageview: false,
				bootstrap: {
					distinctID: session?.user?.id,
				},
			});
		};
		void load();
	}, [session?.user?.id]);
	return children;
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
