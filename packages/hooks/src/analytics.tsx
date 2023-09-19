'use client';

/* eslint-disable @typescript-eslint/naming-convention */
import type { DefaultSession } from 'next-auth';
import posthog from 'posthog-js';
import { createContext, useContext, useEffect, useRef } from 'react';
import {
	type ChannelProps,
	type CommunityPageLinkEvent,
	type JoinWaitlistClickProps,
	JOIN_WAITLIST_EVENT_NAME,
	type MessageProps,
	type ServerInviteEvent,
	type ServerProps,
	type ThreadProps,
} from '@answeroverflow/constants/src/analytics';
import type {
	MessageFull,
	MessageWithDiscordAccount,
} from '@answeroverflow/db';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { webClientEnv } from '@answeroverflow/env/web';
// TODO: This type should be inferred from the auth package
declare module 'next-auth' {
	interface Session extends DefaultSession {
		user: {
			id: string;
		} & DefaultSession['user'];
	}
}

type MessageFullProps = MessageProps & {
	'Solution Author Id'?: string;
};

export type MessagePageViewProps = MessageFullProps &
	ServerProps &
	ChannelProps &
	Partial<ThreadProps>;

export type GettingStartedClickProps = {
	'Button Location': 'Hero' | 'About Area' | 'Pricing' | 'Navbar';
};

export type AddToServerClickProps = {
	'Button Location': 'Quick Start';
};

export type CommunityPageViewProps = ServerProps;

export type ViewOnDiscordClickProps = Pick<ServerProps, 'Server Id'> &
	Pick<ChannelProps, 'Channel Id'> &
	Partial<Pick<ThreadProps, 'Thread Id'>> &
	MessageProps;

export type EventMap = {
	'Message Page View': MessagePageViewProps;
	'View On Discord Click': ViewOnDiscordClickProps;
	'Getting Started Click': GettingStartedClickProps;
	'Add To Server Click': AddToServerClickProps;
	[JOIN_WAITLIST_EVENT_NAME]: JoinWaitlistClickProps;
	'Community Page View': CommunityPageViewProps;
	'Pricing Feedback': {
		email?: string;
		feedback: string;
	};
} & ServerInviteEvent &
	CommunityPageLinkEvent;

export function trackEvent<K extends keyof EventMap | string>(
	eventName: K,
	props: K extends keyof EventMap ? EventMap[K] : Record<string, unknown>,
): void {
	const isServer = typeof window === 'undefined';
	posthog.capture(eventName, {
		...props,
		'Is Server': isServer,
	});
}

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

export function messageWithDiscordAccountToAnalyticsData(
	message: MessageFull | MessageWithDiscordAccount,
): MessageProps {
	return {
		'Channel Id': message.parentChannelId
			? message.parentChannelId
			: message.channelId,
		'Thread Id': message.childThreadId ?? undefined,
		'Server Id': message.serverId,
		'Message Author Id': message.author.id,
		'Message Id': message.id,
	};
}

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
}: {
	children: React.ReactNode;
}) => {
	const [analyticsLoaded, setAnalyticsLoaded] = React.useState(false);
	const { data: session, status } = useSession();
	const router = useRouter();
	useEffect(() => {
		if (status === 'loading') {
			return;
		}
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
			if (
				status === 'authenticated' &&
				session.user &&
				session.user.id != posthog.get_distinct_id()
			) {
				posthog.identify(session.user.id);
			}
		}

		const handleRouteChange = () => posthog.capture('$pageview');
		// router.events.on('routeChangeComplete', handleRouteChange);
		// TODO: handle route change completes with next/navigation
		// return () => {
		// 	router.events.off('routeChangeComplete', handleRouteChange);
		// };
	}, [session, status, analyticsLoaded, setAnalyticsLoaded, router]);
	return (
		<AnalyticsContextProvider value={{ loaded: analyticsLoaded }}>
			{children}
		</AnalyticsContextProvider>
	);
};
