/* eslint-disable @typescript-eslint/naming-convention */
import type { DefaultSession } from 'next-auth';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import posthog from 'posthog-js';
import React, { useEffect, useRef } from 'react';
import {
	ChannelProps,
	CommunityPageLinkEvent,
	JoinWaitlistClickProps,
	JOIN_WAITLIST_EVENT_NAME,
	MessageProps,
	NUMBER_OF_MESSAGES_FIELD_NAME,
	ServerInviteEvent,
	ServerProps,
	ThreadProps,
} from '@answeroverflow/constants/src/analytics';
// TODO: This type should be inferred from the auth package
declare module 'next-auth' {
	interface Session extends DefaultSession {
		user: {
			id: string;
		} & DefaultSession['user'];
	}
}

type MessagePageViewProps = MessageProps &
	ServerProps &
	ChannelProps &
	Partial<ThreadProps> & {
		[NUMBER_OF_MESSAGES_FIELD_NAME]: number;
	};

export type GettingStartedClickProps = {
	'Button Location': 'Hero' | 'About Area' | 'Pricing' | 'Navbar';
};

export type AddToServerClickProps = {
	'Button Location': 'Quick Start';
};

export type CommunityPageViewProps = {} & ServerProps;

type EventMap = {
	'Message Page View': MessagePageViewProps;
	'Getting Started Click': GettingStartedClickProps;
	'Add To Server Click': AddToServerClickProps;
	[JOIN_WAITLIST_EVENT_NAME]: JoinWaitlistClickProps;
	'Community Page View': CommunityPageViewProps;
} & ServerInviteEvent &
	CommunityPageLinkEvent;

export function trackEvent<K extends keyof EventMap>(
	eventName: K,
	props: EventMap[K],
): void {
	const isServer = typeof window === 'undefined';
	posthog.capture(eventName, {
		...props,
		'Is Server': isServer,
	});
}

export function useTrackEvent<K extends keyof EventMap>(
	eventName: K,
	props: EventMap[K],
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

export const useAnalytics = () => {
	const [analyticsLoaded, setAnalyticsLoaded] = React.useState(false);
	const { data: session, status } = useSession();
	const router = useRouter();
	useEffect(() => {
		if (!analyticsLoaded) {
			posthog.init(process.env.NEXT_PUBLIC_POSTHOG_TOKEN as string, {
				// api_host: '/api/tunnel',
				disable_session_recording: process.env.NODE_ENV === 'development',
				loaded: () => {
					setAnalyticsLoaded(true);
				},
			});
		} else {
			if (
				status === 'authenticated' &&
				session.user &&
				session.user.id != posthog.get_distinct_id()
			) {
				posthog.identify(session.user.id);
			}
		}

		const handleRouteChange = () => posthog.capture('$pageview');
		router.events.on('routeChangeComplete', handleRouteChange);
		return () => {
			router.events.off('routeChangeComplete', handleRouteChange);
		};
	}, [session, status, analyticsLoaded, setAnalyticsLoaded, router]);
};
