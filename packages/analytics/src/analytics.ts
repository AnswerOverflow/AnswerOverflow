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

export type BaseProps = {
	'Answer Overflow Account Id': string;
};

interface EventMap {}

export function registerServerGroup(props: ServerProps) {
	client.groupIdentify({
		groupType: 'server',
		groupKey: props['Server Id'],
		properties: {
			...props,
		},
	});
}

export function trackServerSideEvent<K extends BaseProps>(
	eventName: string,
	props: K,
): void {
	const { 'Answer Overflow Account Id': aoId } = props;
	const captureData: Parameters<typeof client.capture>[0] = {
		event: eventName,
		distinctId: aoId,
		properties: props,
	};
	const serverId = 'Server Id' in props ? props['Server Id'] : undefined;
	if (
		(serverId !== undefined && typeof serverId === 'string') ||
		typeof serverId === 'number'
	) {
		captureData.groups = {
			server: serverId,
		};
	}
	client.capture(captureData);
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
