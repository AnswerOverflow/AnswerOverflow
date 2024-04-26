import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { generateSitemap } from '@answeroverflow/db/src/sitemap';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { CronJob } from 'cron';

@ApplyOptions<Listener.Options>({ event: Events.ClientReady })
export class LoopSitemap extends Listener {
	public run() {
		if (sharedEnvs.NODE_ENV === 'development') {
			this.container.logger.info(
				'Skipping sitemap generation in development mode.',
			);
			return;
		}
		CronJob.from({
			// every morning at 1 am pst
			cronTime: '0 1 * * *',
			onTick: async () => {
				await generateSitemap();
			},
			start: true,
			timeZone: 'America/Los_Angeles',
		});
	}
}
