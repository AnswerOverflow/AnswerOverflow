import { sharedEnvs } from '@answeroverflow/env/shared';
import { PostHog } from '@typelytics/posthog';
import { events } from './events';

const posthog = new PostHog({
	events: events,
	apiKey: sharedEnvs.POSTHOG_PERSONAL_API_KEY!,
	projectId: sharedEnvs.POSTHOG_PROJECT_ID!.toString(),
});

const pageViews = posthog
	.query()
	.addSeries('$pageview', {
		sampling: 'total',
	})
	.execute({
		type: 'line',
	});

export function getTopQuestionSolversForServer(id: string) {
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
