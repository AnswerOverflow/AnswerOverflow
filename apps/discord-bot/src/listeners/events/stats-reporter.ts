import { Analytics } from '@answeroverflow/core/analytics';
import { botEnv } from '@answeroverflow/env/bot';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { CronJob } from 'cron';
import { Client } from 'discord.js';

// Create a function to represent the stats in board format
function createBoard(statistics: {
	totalPageViews: number;
	newServers: number;
	questionsAsked: number;
	serverInviteClicks: number;
}) {
	const board = Array(6)
		.fill(0)
		.map(() => Array(22).fill(0));
	function writeRow(row: number, text: string) {
		for (let i = 0; i < text.length; i++) {
			const cell = board[row]?.[i];
			if (cell !== undefined) {
				// do character codes as they appear in the alphabet, i.e a is 1, b is 2, etc.
				// if it is a number, do the number + 26
				// a colon is 50, a space is 0
				const charCode =
					text.charCodeAt(i) === 58
						? 50
						: text.charCodeAt(i) === 32
							? 0
							: text.charCodeAt(i) - 96 > 0
								? text.charCodeAt(i) - 96
								: text.charCodeAt(i) - 64 + 26;
				// if negative, log what was meant to be written
				if (charCode < 0) {
					console.error(
						'Negative character code',
						text.charCodeAt(i),
						`character: ${text.at(i)}`,
					);
				}
				board[row]![i] = charCode;
			} else {
				console.error('Cell not found', row, i);
			}
		}
	}
	writeRow(0, 'Daily AO Stats:');
	writeRow(2, `Page Views: ${statistics.totalPageViews}`);
	writeRow(3, `New Servers: ${statistics.newServers}`);
	writeRow(4, `Questions Asked: ${statistics.questionsAsked}`);
	writeRow(5, `Invites Used: ${statistics.serverInviteClicks}`);
	return board;
}

async function reportStats() {
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
	console.log(wrapped);
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
		await reportStats();
	}
}
