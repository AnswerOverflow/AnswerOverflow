import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { generateSitemap } from '@answeroverflow/db/src/sitemap';
import { sharedEnvs } from '@answeroverflow/env/shared';
// eslint-disable-next-line n/no-extraneous-import
import { CronJob } from 'cron';
import { findAllServers } from '@answeroverflow/db';
import { cacheQuestionsForSitemap } from '@answeroverflow/cache';

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
				const servers = await findAllServers({
					includeCustomDomain: true,
					includeKicked: false,
				});
				for await (const server of servers) {
					await cacheQuestionsForSitemap(server.id);
					// wait for 1 second
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			},
			start: true,
			timeZone: 'America/Los_Angeles',
		});
	}
}
