import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { hoursToMs } from '~discord-bot/utils/utils';
// import { generateSitemap } from '@answeroverflow/db/src/sitemap';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { findAllServers } from '@answeroverflow/db';
import { cacheQuestionsForSitemap } from '@answeroverflow/cache';
@ApplyOptions<Listener.Options>({ event: Events.ClientReady })
export class LoopSitemap extends Listener {
	public run() {
		// temporarily disabled
		if (sharedEnvs.NODE_ENV === 'development') {
			this.container.logger.info(
				'Skipping sitemap generation in development mode.',
			);
			return;
		}

		// for now, just fetch the existing sitemap index and sub sitemaps
		// to keep the sitemap up to date
		const refreshSitemaps = async () => {
			const servers = await findAllServers({
				includeCustomDomain: true,
				includeKicked: false,
			});
			for await (const server of servers) {
				await cacheQuestionsForSitemap(server.id);
				// wait for 1 second
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		};
		// refresh sitemaps every 6 hours
		setInterval(() => refreshSitemaps, hoursToMs(6));
		void refreshSitemaps();
	}
}
