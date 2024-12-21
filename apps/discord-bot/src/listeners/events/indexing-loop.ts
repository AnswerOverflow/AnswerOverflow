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
		CronJob.from({
			cronTime: '0 */6 * * *',
			onTick: async () => {
				try {
					await indexServers(client);
				} catch (error) {
					console.error('Error in scheduled indexing:', error);
				}
			},
			start: true,
			timeZone: 'America/Los_Angeles',
		});
		if (botEnv.NODE_ENV !== 'production') {
			try {
				await indexServers(client);
			} catch (error) {
				console.error('Error in development mode indexing:', error);
			}
		} else {
			setTimeout(async () => {
				try {
					await indexServers(client);
				} catch (error) {
					console.error('Error in production initial indexing:', error);
				}
			}, 60000);
		}
	}
}
