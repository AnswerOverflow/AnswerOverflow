import { Analytics } from '@answeroverflow/core/analytics';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { CronJob } from 'cron';

async function reportStats() {
	if (!process.env.VESTABOARD_API_KEY) {
		return;
	}
	const totalPageViewsPromise = Analytics.queryClient!.query()
		.addSeries('$pageview', {
			sampling: 'total',
		})
		.execute({
			type: 'number',
			date_from: 'Last 24 hours',
		});
	const newServersPromise = Analytics.queryClient!.query()
		.addSeries('Server Join', {
			sampling: 'total',
		})
		.execute({
			type: 'number',
			date_from: 'Last 24 hours',
		});
	const questionsAskedPromise = Analytics.queryClient!.query()
		.addSeries('Asked Question', {
			sampling: 'total',
			date_from: 'Last 24 hours',
		})
		.execute({
			type: 'number',
			date_from: 'Last 24 hours',
		});
	const serverInviteClicksPromise = Analytics.queryClient!.query()
		.addSeries('Server Invite Click', {
			sampling: 'total',
			date_from: 'Last 24 hours',
		})
		.execute({
			type: 'number',
			date_from: 'Last 24 hours',
		});
	const [totalPageViews, newServers, questionsAsked, serverInviteClicks] =
		await Promise.all([
			totalPageViewsPromise,
			newServersPromise,
			questionsAskedPromise,
			serverInviteClicksPromise,
		]);

	function prettyNumber(value: number) {
		return value.toLocaleString();
	}
	// add commas to the numbers
	const totalPageViewsRounded = prettyNumber(
		totalPageViews.results.$pageview.aggregated_value,
	);
	const newServersRounded = prettyNumber(
		newServers.results['Server Join'].aggregated_value,
	);
	const questionsAskedRounded = prettyNumber(
		questionsAsked.results['Asked Question'].aggregated_value,
	);
	const serverInviteClicksRounded = prettyNumber(
		serverInviteClicks.results['Server Invite Click'].aggregated_value,
	);
	const wrapped = `
Daily AO Stats
Page Views  :${totalPageViewsRounded}
New Servers :${newServersRounded}
Questions   :${questionsAskedRounded}
Invites Used:${serverInviteClicksRounded}`;
	const content = await fetch('https://vbml.vestaboard.com/format/', {
		body: JSON.stringify({
			message: wrapped,
		}),
		headers: {
			'Content-Type': 'application/json',
		},
		method: 'POST',
	});

	const response = (await content.json()) as number[][];
	// add a row of 0s in between the header and the stats, remove the last row
	response.splice(1, 0, Array(22).fill(0));
	response.pop();
	const writeStatus = await fetch('https://rw.vestaboard.com/', {
		body: JSON.stringify(response),
		headers: {
			'Content-Type': 'application/json',
			'X-Vestaboard-Read-Write-Key': process.env.VESTABOARD_API_KEY!,
		},
		method: 'POST',
	});
	if (!writeStatus.ok) {
		console.error('Failed to write stats to board', writeStatus);
	}
}

@ApplyOptions<Listener.Options>({
	once: true,
	event: Events.ClientReady,
	name: 'stats-reporter',
})
export class StatsReporter extends Listener {
	public async run() {
		CronJob.from({
			// every day at 4:32 pm
			cronTime: '32 16 * * *',
			onTick: async () => {
				try {
					await reportStats();
				} catch (error) {
					console.error('Error in scheduled stats reporting:', error);
				}
			},
			start: true,
			timeZone: 'America/Los_Angeles',
		});
	}
}
