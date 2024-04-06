import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
// import { hoursToMs } from '~discord-bot/utils/utils';
// import { generateSitemap } from '@answeroverflow/db/src/sitemap';
import { sharedEnvs } from '@answeroverflow/env/shared';
// eslint-disable-next-line n/no-extraneous-import
import { XMLParser } from 'fast-xml-parser';
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
		// 	// eslint-disable-next-line @typescript-eslint/no-misused-promises
		// 	setInterval(async () => {
		// 		await generateSitemap();
		// 	}, hoursToMs(6));

		// for now, just fetch the existing sitemap index and sub sitemaps
		// to keep the sitemap up to date
		const refreshSitemaps = async () => {
			const sitemapIndex = await fetch(
				'https://answeroverflow.com/sitemap.xml',
			);
			const sitemapIndexText = await sitemapIndex.text();
			const sitemapIndexXml = new XMLParser().parse(sitemapIndexText) as {
				sitemapindex: {
					sitemap: {
						loc: string;
					}[];
				};
			};

			const sitemapUrls = sitemapIndexXml.sitemapindex.sitemap.map(
				(sitemap) => sitemap.loc,
			);
			this.container.logger.info(`Fetching ${sitemapUrls.length} sitemaps`);
			const sitemaps = sitemapUrls
				.filter((url) => url?.includes('sitemap'))
				.filter(Boolean);
			for await (const sitemap of sitemaps) {
				await fetch(sitemap);
				this.container.logger.info(`Fetched sitemap: ${sitemap}`);
				// wait for 1 second
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		};
		// refresh sitemaps every 6 hours
		setInterval(() => refreshSitemaps, 6 * 60 * 60 * 1000);
		void refreshSitemaps();
	}
}
