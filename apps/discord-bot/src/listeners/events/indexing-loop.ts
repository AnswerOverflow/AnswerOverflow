import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Client, Events } from 'discord.js';
import { container } from '@sapphire/framework';
import { indexServers } from '~discord-bot/domains/indexing';
import { delay } from '@answeroverflow/discordjs-mock';

@ApplyOptions<Listener.Options>({ once: true, event: Events.ClientReady })
export class Indexing extends Listener {
	public async run(client: Client) {
		if (process.env.INDEXING_DISABLED) {
			return;
		}
		// Wait for everything to be ready
		if (process.env.NODE_ENV === 'production') await delay(120 * 1000);
		const intervalInHours = process.env.INDEXING_INTERVAL_IN_HOURS
			? parseFloat(process.env.INDEXING_INTERVAL_IN_HOURS)
			: 24;
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
