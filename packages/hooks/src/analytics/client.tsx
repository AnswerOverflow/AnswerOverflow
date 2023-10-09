'use client';
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Session } from 'next-auth';
import { useNavigationEvent } from '../use-navigation-event';
import posthog from 'posthog-js';
import { webClientEnv } from '@answeroverflow/env/web';
import { EventMap, trackEvent } from './events';

const analyticsContext = createContext<{
	loaded: boolean;
} | null>(null);

export const AnalyticsContextProvider = analyticsContext.Provider;

export const useAnalyticsContext = () => {
	const context = useContext(analyticsContext);
	if (!context) {
		throw new Error('useAnalyticsContext must be used within Analytics');
	}
	return context;
};

export const AnalyticsProvider = ({
	children,
	session,
}: {
	children: React.ReactNode;
	session?: Session | null;
}) => {
	const [analyticsLoaded, setAnalyticsLoaded] = React.useState(false);
	useNavigationEvent({
		onChange: () => {
			posthog.capture('$pageview');
		},
	});
	useEffect(() => {
		if (!analyticsLoaded && webClientEnv.NEXT_PUBLIC_POSTHOG_TOKEN) {
			posthog.init(webClientEnv.NEXT_PUBLIC_POSTHOG_TOKEN, {
				disable_session_recording: true,
				persistence: 'memory',
				bootstrap: {
					distinctID: session?.user?.id,
				},
				loaded: () => {
					setAnalyticsLoaded(true);
				},
			});
		} else {
			// TODO: Still needed?
			if (session && session?.user?.id != posthog.get_distinct_id()) {
				posthog.identify(session.user.id);
			}
		}
	}, [session, analyticsLoaded, setAnalyticsLoaded]);
	return (
		<AnalyticsContextProvider value={{ loaded: analyticsLoaded }}>
			{children}
		</AnalyticsContextProvider>
	);
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
	const { loaded: isAnalyticsLoaded } = useAnalyticsContext();
	useEffect(() => {
		const options = opts || {};
		const enabled = opts?.enabled ?? true;
		if (!enabled) return;
		if (!isAnalyticsLoaded) return;
		if (!hasSentAnalyticsEvent.current) {
			trackEvent(eventName, props);
			if (options.runOnce) {
				hasSentAnalyticsEvent.current = true;
			}
		}
	}, [hasSentAnalyticsEvent, eventName, props, opts, isAnalyticsLoaded]);
}
