import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { type AnyThreadChannel, Events, Message } from 'discord.js';

import { findChannelById } from '@answeroverflow/core/channel';
import { getRootChannel } from '../../utils/utils';

@ApplyOptions<Listener.Options>({
	event: Events.MessageCreate,
	name: 'onMessageInChannelWithSettings',
})
export class OnMessageInChannelWithSettings extends Listener<Events.MessageCreate> {
	public async run(message: Message) {
		try {
			// Couple shortcuts to avoid spamming our database
			if (message.channel.isDMBased()) return;
			if (message.channel.isVoiceBased()) return;
			const rootChannel = getRootChannel(message.channel);
			if (!rootChannel) return;
			const channel = await findChannelById(rootChannel.id);
			if (!channel) return;
			// @ts-expect-error todo: revisit
			this.container.events.next({
				action: 'messageCreate',
				data: {
					raw: [message],
					channelSettings: channel,
				},
			});
		} catch (error) {
			console.error('Error in OnMessageInChannelWithSettings:', error);
		}
	}
}

@ApplyOptions<Listener.Options>({
	event: Events.ThreadCreate,
	name: 'onThreadCreateInChannelWithSettings',
})
export class OnThreadCreateInChannelWithSettings extends Listener<Events.ThreadCreate> {
	public async run(thread: AnyThreadChannel, newlyCreated: boolean) {
		try {
			const rootChannel = getRootChannel(thread);
			if (!rootChannel) return;
			const channel = await findChannelById(rootChannel.id);
			if (!channel) return;
			this.container.events.next({
				action: 'threadCreate',
				data: {
					raw: [thread, newlyCreated],
					channelSettings: channel,
				},
			});
		} catch (error) {
			console.error('Error in OnThreadCreateInChannelWithSettings:', error);
		}
	}
}
