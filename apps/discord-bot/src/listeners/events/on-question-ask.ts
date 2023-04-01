import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';

@ApplyOptions<Listener.Options>({ event: Events.ClientReady })
export class QuestionAskedListener extends Listener<Events.ClientReady> {
	public run() {
		this.container.events.subscribe((event) => {
			if (event.action !== 'threadCreate') {
				return;
			}
			if (
				event.data.channelSettings.flags.indexingEnabled ||
				event.data.channelSettings.flags.markSolutionEnabled
			) {
				this.container.events.next({
					action: 'questionAsked',
					data: event.data,
				});
			}
		});
	}
}
