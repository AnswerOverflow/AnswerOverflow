import { PostHog as PostHogQueryClient } from '@typelytics/posthog';
import { events } from './analytics.events';

const posthogQueryClient =
	sharedEnvs.POSTHOG_PERSONAL_API_KEY && sharedEnvs.POSTHOG_PROJECT_ID
		? new PostHogQueryClient({
				events: events,
				host: 'us.posthog.com',
				apiKey: sharedEnvs.POSTHOG_PERSONAL_API_KEY,
				projectId: sharedEnvs.POSTHOG_PROJECT_ID.toString(),
			})
		: undefined;

function getPosthogQueryClientForDashboard(opts: Options) {
	return new PostHogQueryClient({
		events,
		apiKey: sharedEnvs.POSTHOG_PERSONAL_API_KEY!,
		projectId: sharedEnvs.POSTHOG_PROJECT_ID!.toString(),
		globalFilters: {
			filters: {
				compare: 'exact',
				property: 'Server Id',
				value: opts.serverId,
			},
		},
		executionOptions: {
			type: 'line',
			// @ts-expect-error
			date_to: opts.to?.toISOString().split('T')[0]!,
			// @ts-expect-error
			date_from: opts.from?.toISOString().split('T')[0]!,
		},
	});
}

type Options = {
	serverId: string;
	to?: Date;
	from?: Date;
};

import type { ServerProps } from '@answeroverflow/constants/analytics';
import { sharedEnvs } from '@answeroverflow/env/shared';
import type { DefaultSession } from 'next-auth';
import { PostHog as PostHogCaptureClient } from 'posthog-node';

const apiKey = sharedEnvs.NEXT_PUBLIC_POSTHOG_TOKEN;
const shouldCollectAnalytics =
	apiKey !== undefined && sharedEnvs.NODE_ENV !== 'test';

const posthogCaptureClient = shouldCollectAnalytics
	? new PostHogCaptureClient(apiKey)
	: undefined;

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

export module Analytics {
	export const queryClient = posthogQueryClient;
	export const captureClient = posthogCaptureClient;
	export function getTopQuestionSolversForServer(opts: Options) {
		return getPosthogQueryClientForDashboard(opts)
			.query()
			.addSeries('Solved Question', {
				sampling: 'total',
			})
			.execute({
				type: 'table',
				date_from: opts.from && 'All time',
				breakdown_hide_other_aggregation: true,
				breakdown: 'Question Solver Id',
			})
			.then((x) => x.results['Solved Question']);
	}

	export function getTopPages(opts: Options) {
		return getPosthogQueryClientForDashboard(opts)
			.query()
			.addSeries('Message Page View', {
				sampling: 'total',
			})
			.execute({
				type: 'table',
				breakdown_hide_other_aggregation: true,
				refresh: true,
				breakdown: 'Message Id',
			})
			.then((x) => x.results['Message Page View']);
	}

	export function getPopularPostPages() {
		if (!posthogQueryClient) return;
		return posthogQueryClient
			.query()
			.addSeries('Message Page View', {
				sampling: 'total',
				where: {
					filters: {
						compare: 'not_icontains',
						property: 'Server Id',
						value: '743801649377574924',
					},
					match: 'AND',
				},
			})
			.execute({
				type: 'table',
				breakdown_hide_other_aggregation: true,
				refresh: true,
				date_from: 'Last 30 days',
				breakdown: 'Message Id',
			})
			.then((x) => x.results['Message Page View']);
	}

	export async function getPopularServers() {
		if (!posthogQueryClient) return;
		return posthogQueryClient
			.query()
			.addSeries('Message Page View', {
				sampling: 'total',
			})
			.execute({
				type: 'table',
				breakdown_hide_other_aggregation: true,
				refresh: true,
				date_from: 'Last 30 days',
				breakdown: 'Server Id',
			})
			.then((x) => x.results['Message Page View']);
	}

	export function getPageViewsForServer(opts: Options) {
		return getPosthogQueryClientForDashboard(opts)
			.query()
			.addSeries('Message Page View', {
				label: 'Page Views',
				sampling: 'total',
			})
			.execute({ type: 'area' });
	}

	export function getServerInvitesClicked(opts: Options) {
		return getPosthogQueryClientForDashboard(opts)
			.query()
			.addSeries('Server Invite Click', {
				label: 'Invite Clicked',
				sampling: 'total',
			})
			.execute({ type: 'bar' });
	}

	export function getQuestionsAndAnswers(opts: Options) {
		return getPosthogQueryClientForDashboard(opts)
			.query()
			.addSeries('Asked Question', {
				label: 'Questions Asked',
				sampling: 'total',
			})
			.addSeries('Solved Question', {
				label: 'Questions Solved',
				sampling: 'total',
			})
			.execute({ type: 'area' });
	}

	export function registerServerGroup(props: ServerProps) {
		if (!posthogCaptureClient) return;
		posthogCaptureClient.groupIdentify({
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
		if (!posthogCaptureClient) return;
		const { 'Answer Overflow Account Id': aoId } = props;
		const captureData: Parameters<PostHogCaptureClient['capture']>[0] = {
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
		posthogCaptureClient.capture(captureData);
	}

	export function identifyDiscordAccount(
		answerOverflowAccountId: string,
		discordAccountInfo: {
			id: string;
			username: string;
			email: string;
		},
	) {
		if (!posthogCaptureClient) return;
		posthogCaptureClient.identify({
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
		if (!posthogCaptureClient) return;
		posthogCaptureClient.alias({
			distinctId: input.answerOverflowAccountId,
			alias: input.otherId,
		});
	}

	export async function finishAnalyticsCollection() {
		if (!posthogCaptureClient) return;
		// todo: waitFor()
		await posthogCaptureClient.shutdown();
	}
}
