import type { DefaultSession } from 'next-auth';
import { PostHog } from 'posthog-node';
import type { ServerProps } from '@answeroverflow/constants';
const apiKey = process.env.NEXT_PUBLIC_POSTHOG_TOKEN;
const shouldCollectAnalytics =
	apiKey !== undefined && process.env.NODE_ENV !== 'test';

const client = new PostHog(
	apiKey || '',
	{ enable: shouldCollectAnalytics }, // You can omit this line if using PostHog Cloud
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
type ServerLeaveProps = ServerProps & {
	'Time In Server': number;
};

interface EventMap {
	'Server Join': ServerJoinProps;
	'Server Leave': ServerLeaveProps;
}

export function registerServerGroup(props: ServerProps) {
	client.groupIdentify({
		groupType: 'server',
		groupKey: props['Server Id'],
		properties: {
			...props,
		},
	});
}

export function trackServerSideEvent<K extends keyof EventMap>(
	eventName: K,
	props: EventMap[K] & BaseProps,
): void {
	const { 'Answer Overflow Account Id': aoId, ...properties } = props;
	client.capture({
		event: eventName,
		groups: {
			server: props['Server Id'],
		},
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
