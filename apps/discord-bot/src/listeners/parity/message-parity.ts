import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Collection, Events, Message, type Snowflake } from 'discord.js';

import {
	deleteManyMessages,
	deleteMessage,
	findMessageById,
} from '@answeroverflow/core/message';
import { upsertMessage } from '@answeroverflow/core/message-node';
import { toAOMessage } from '../../utils/conversions';

@ApplyOptions<Listener.Options>({
	event: Events.MessageDelete,
	name: 'Message Delete Watcher',
})
export class OnMessageDelete extends Listener {
	public async run(message: Message) {
		try {
			const msg = await findMessageById(message.id);
			if (msg) await deleteMessage(message.id);
		} catch (error) {
			console.error('Error in Message Delete Watcher:', error);
		}
	}
}

@ApplyOptions<Listener.Options>({
	event: Events.MessageBulkDelete,
	name: 'Message Delete Bulk Watcher',
})
export class OnMessageBulkDelete extends Listener {
	public async run(messages: Collection<Snowflake, Message>) {
		try {
			await deleteManyMessages(messages.map((message) => message.id));
		} catch (error) {
			console.error('Error in Message Delete Bulk Watcher:', error);
		}
	}
}

@ApplyOptions<Listener.Options>({
	event: Events.MessageUpdate,
	name: 'Message Update Watcher',
})
export class OnMessageUpdate extends Listener {
	public async run(_: Message, newMessage: Message) {
		try {
			const existing = await findMessageById(newMessage.id);
			if (!existing) return;
			const converted = await toAOMessage(newMessage);
			await upsertMessage({
				...converted,
				questionId: existing.questionId,
			});
		} catch (error) {
			console.error('Error in Message Update Watcher:', error);
		}
	}
}
