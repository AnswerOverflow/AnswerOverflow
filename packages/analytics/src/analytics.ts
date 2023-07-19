import type { DefaultSession } from 'next-auth';
import { PostHog } from 'posthog-node';
import type { ServerProps } from '@answeroverflow/constants';
import { sharedEnvs } from '@answeroverflow/env/shared';
const apiKey = sharedEnvs.NEXT_PUBLIC_POSTHOG_TOKEN;
const shouldCollectAnalytics =
	apiKey !== undefined && sharedEnvs.NODE_ENV !== 'test';

const client = shouldCollectAnalytics ? new PostHog(apiKey) : undefined;
if (!client && sharedEnvs.NODE_ENV !== 'test') {
	console.warn('Analytics collection is disabled');
}
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

export function registerServerGroup(props: ServerProps) {
	if (!client) return;
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
	if (!client) return;
	const { 'Answer Overflow Account Id': aoId } = props;
	const captureData: Parameters<PostHog['capture']>[0] = {
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
	if (!client) return;
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
	if (!client) return;
	client.alias({
		distinctId: input.answerOverflowAccountId,
		alias: input.otherId,
	});
}

export async function finishAnalyticsCollection() {
	if (!client) return;
	await client.shutdownAsync();
}
