import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Message, Events, Collection, type Snowflake } from 'discord.js';
import {
	deleteManyMessages,
	deleteMessage,
	findMessageById,
	updateMessage,
} from '@answeroverflow/db';
import { toAOMessage } from '~discord-bot/utils/conversions';

@ApplyOptions<Listener.Options>({
	event: Events.MessageDelete,
	name: 'Message Delete Watcher',
})
export class OnMessageDelete extends Listener {
	public async run(message: Message) {
		const msg = await findMessageById(message.id);
		if (msg) await deleteMessage(message.id);
	}
}

@ApplyOptions<Listener.Options>({
	event: Events.MessageBulkDelete,
	name: 'Message Delete Bulk Watcher',
})
export class OnMessageBulkDelete extends Listener {
	public async run(messages: Collection<Snowflake, Message>) {
		await deleteManyMessages(messages.map((message) => message.id));
	}
}

@ApplyOptions<Listener.Options>({
	event: Events.MessageUpdate,
	name: 'Message Update Watcher',
})
export class OnMessageUpdate extends Listener {
	public async run(_: Message, newMessage: Message) {
		const existing = await findMessageById(newMessage.id);
		if (!existing) return;
		const converted = await toAOMessage(newMessage);
		await updateMessage({
			...converted,
			solutionIds: existing.solutionIds,
		});
	}
}
