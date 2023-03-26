import type { DefaultSession } from 'next-auth';
import { PostHog } from 'posthog-node';
import type { ServerProps } from '@answeroverflow/constants';
const apiKey = process.env.POSTHOG_API_KEY;
const shouldCollectAnalytics =
	apiKey !== undefined && process.env.NODE_ENV !== 'test';

const client = new PostHog(
	apiKey || '',
	{ host: 'https://app.posthog.com', enable: shouldCollectAnalytics }, // You can omit this line if using PostHog Cloud
);

// TODO: This type should be inferred from the auth package
declare module 'next-auth' {
	interface Session extends DefaultSession {
		user: {
			id: string;
		} & DefaultSession['user'];
	}
}

type BaseProps = {
	'Answer Overflow Account Id': string;
};

type ServerJoinProps = ServerProps;

interface EventMap {
	'Server Join': ServerJoinProps;
}

export function trackEvent<K extends keyof EventMap>(
	eventName: K,
	props: EventMap[K] & BaseProps,
): void {
	const { 'Answer Overflow Account Id': aoId, ...properties } = props;
	client.capture({
		event: eventName,
		distinctId: aoId,
		properties,
	});
}

export function identifyDiscordAccount(
	answerOverflowAccountId: string,
	discordAccountInfo: {
		id: string;
		username: string;
		email: string;
	},
) {
	client.identify({
		distinctId: answerOverflowAccountId,
		properties: {
			Email: discordAccountInfo.email,
			'Discord Id': discordAccountInfo.id,
			'Discord Username': discordAccountInfo.username,
		},
	});
}

export function linkAnalyticsAccount(input: {
	answerOverflowAccountId: string;
	otherId: string;
}) {
	client.alias({
		distinctId: input.answerOverflowAccountId,
		alias: input.otherId,
	});
}

export async function finishAnalyticsCollection() {
	await client.shutdownAsync();
}
