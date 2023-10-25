/* eslint-disable-next-line @typescript-eslint/naming-convention */
import type { DefaultSession } from 'next-auth';

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
	const capture = async () => {
		await import('posthog-js').then(({ default: posthog }) => {
			posthog.capture(eventName, {
				...props,
				'Is Server': isServer,
			});
		});
	};
	void capture();
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
