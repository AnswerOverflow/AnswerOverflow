import { botEnv } from '@answeroverflow/env/bot';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { CronJob } from 'cron';
import { Client } from 'discord.js';
import { indexServers } from '../../domains/indexing';

@ApplyOptions<Listener.Options>({
	once: true,
	event: Events.ClientReady,
	name: 'indexing-timer',
})
export class Indexing extends Listener {
	public async run(client: Client) {
		if (botEnv.INDEXING_DISABLED) {
			return;
		}
		// set timeout, 3 seconds, throw error
		setTimeout(() => {
			throw new Error('Test error');
		}, 3000);
		CronJob.from({
			// every 6 hours
			cronTime: '0 */6 * * *',
			onTick: async () => {
				await indexServers(client);
			},
			start: true,
			timeZone: 'America/Los_Angeles',
		});
		if (botEnv.NODE_ENV !== 'production') {
			await indexServers(client);
		}
	}
}
