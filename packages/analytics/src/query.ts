import { sharedEnvs } from '@answeroverflow/env/shared';
import { PostHog } from '@typelytics/posthog';
import { events } from './events';

const posthog =
	sharedEnvs.POSTHOG_PERSONAL_API_KEY && sharedEnvs.POSTHOG_PROJECT_ID
		? new PostHog({
				events: events,
				apiKey: sharedEnvs.POSTHOG_PERSONAL_API_KEY,
				projectId: sharedEnvs.POSTHOG_PROJECT_ID.toString(),
		  })
		: undefined;

export function getTopQuestionSolversForServer(id: string) {
	if (!posthog) return;
	return posthog
		.query()
		.addSeries('Solved Question', {
			sampling: 'total',
		})
		.addFilterGroup({
			match: 'AND',
			filters: {
				compare: 'exact',
				value: id,
				property: 'Server Id',
			},
		})
		.execute({
			type: 'table',
			date_from: 'All time',
			breakdown_hide_other_aggregation: true,
			breakdown: 'Question Solver Id',
		})
		.then((x) => x.results['Solved Question']);
}

export function getPopularPostPages() {
	if (!posthog) return;
	return posthog
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
	if (!posthog) return;
	return posthog
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

function getPosthogQueryClientForDashboard(opts: {
	serverId: string;
	to: Date;
	from: Date;
}) {
	return new PostHog({
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
			date_to: opts.to.toISOString().split('T')[0]!,
			// @ts-expect-error
			date_from: opts.from.toISOString().split('T')[0]!,
		},
	});
}

export function getPageViewsForServer(opts: {
	serverId: string;
	to: Date;
	from: Date;
}) {
	return getPosthogQueryClientForDashboard(opts)
		.query()
		.addSeries('Message Page View', {
			label: 'Page Views',
			sampling: 'total',
		})
		.execute({ type: 'line' });
}

export function getServerInvitesClicked(opts: {
	serverId: string;
	to: Date;
	from: Date;
}) {
	return getPosthogQueryClientForDashboard(opts)
		.query()
		.addSeries('Server Invite Click', {
			label: 'Invite Clicked',
			sampling: 'total',
		})
		.execute({ type: 'number' });
}
