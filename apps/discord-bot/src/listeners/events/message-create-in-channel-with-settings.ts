import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, Message } from 'discord.js';
import { findChannelById } from '@answeroverflow/db';

@ApplyOptions<Listener.Options>({ event: Events.MessageCreate })
export class OnMessageInChannelWithSettings extends Listener {
	public async run(message: Message) {
		const channel = await findChannelById(message.channelId);
		if (!channel) return;
		this.container.events.next({
			action: 'messageCreate',
			data: {
				raw: [message],
				channelSettings: channel,
			},
		});
	}
}
