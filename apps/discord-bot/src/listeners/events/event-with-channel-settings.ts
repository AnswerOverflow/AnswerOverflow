import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, Message, AnyThreadChannel } from 'discord.js';
import { findChannelById } from '@answeroverflow/db';

@ApplyOptions<Listener.Options>({
	event: Events.MessageCreate,
	name: 'onMessageInChannelWithSettings',
})
export class OnMessageInChannelWithSettings extends Listener<Events.MessageCreate> {
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

@ApplyOptions<Listener.Options>({
	event: Events.ThreadCreate,
	name: 'onThreadCreateInChannelWithSettings',
})
export class OnThreadCreateInChannelWithSettings extends Listener<Events.ThreadCreate> {
	public async run(thread: AnyThreadChannel, newlyCreated: boolean) {
		if (thread.parentId === null) return;
		const channel = await findChannelById(thread.parentId);
		if (!channel) return;
		this.container.events.next({
			action: 'threadCreate',
			data: {
				raw: [thread, newlyCreated],
				channelSettings: channel,
			},
		});
	}
}
