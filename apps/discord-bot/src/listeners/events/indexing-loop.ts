import { ApplyOptions } from '@sapphire/decorators';
import { Listener, Events } from '@sapphire/framework';
import { Client } from 'discord.js';
import { container } from '@sapphire/framework';
import { delay } from '@answeroverflow/discordjs-mock';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { botEnv } from '@answeroverflow/env/bot';
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
		// Wait for everything to be ready
		if (sharedEnvs.NODE_ENV === 'production') await delay(3600 * 1000);
		const intervalInHours = botEnv.STATUS_UPDATE_INTERVAL_IN_HOURS;
		container.logger.info(
			`Indexing all servers every ${intervalInHours} hours`,
		);
		const intervalInMs = intervalInHours * 60 * 60 * 1000;
		await indexServers(client); // Do an initial index before the loop kicks in
		setInterval(() => {
			void indexServers(client);
		}, intervalInMs);
	}
}
