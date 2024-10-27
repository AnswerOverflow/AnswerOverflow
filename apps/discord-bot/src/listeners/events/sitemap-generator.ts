import { findAllServers } from '@answeroverflow/core/server';
import {
	cacheQuestionsForSitemap,
	generateSitemap,
} from '@answeroverflow/core/sitemap';
import { botEnv } from '@answeroverflow/env/bot';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
// eslint-disable-next-line n/no-extraneous-import
import { CronJob } from 'cron';
import { Events } from 'discord.js';

@ApplyOptions<Listener.Options>({ event: Events.ClientReady })
export class LoopSitemap extends Listener {
	public run() {
		if (botEnv.NODE_ENV === 'development') {
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
