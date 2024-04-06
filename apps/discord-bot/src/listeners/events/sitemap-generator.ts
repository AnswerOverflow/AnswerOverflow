import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { hoursToMs } from '~discord-bot/utils/utils';
import { generateSitemap } from '@answeroverflow/db/src/sitemap';
import { sharedEnvs } from '@answeroverflow/env/shared';

@ApplyOptions<Listener.Options>({ event: Events.ClientReady })
export class LoopSitemap extends Listener {
	public run() {
		if (sharedEnvs.NODE_ENV === 'development') {
			this.container.logger.info(
				'Skipping sitemap generation in development mode.',
			);
			return;
		}
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		setInterval(async () => {
			await generateSitemap();
		}, hoursToMs(6));
	}
}
