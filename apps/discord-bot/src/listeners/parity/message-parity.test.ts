import { Collection, Events, Message, TextChannel } from 'discord.js';
import type { SapphireClient } from '@sapphire/framework';
import {
	toAODiscordAccount,
	toAOMessage,
} from '~discord-bot/utils/conversions';
import {
	mockTextChannel,
	mockMessage,
	emitEvent,
	copyClass,
} from '@answeroverflow/discordjs-mock';
import { setupAnswerOverflowBot } from '~discord-bot/test/sapphire-mock';
import {
	createDiscordAccount,
	findMessageById,
	upsertMessage,
} from '@answeroverflow/db';

let client: SapphireClient;
let message: Message;
let textChannel: TextChannel;

beforeEach(async () => {
	client = await setupAnswerOverflowBot();
	textChannel = mockTextChannel(client);
	message = mockMessage({ client, channel: textChannel });
	await createDiscordAccount(toAODiscordAccount(message.author));
});

describe('Message Delete Tests', () => {
	it('should deleted a cached message', async () => {
		await upsertMessage(toAOMessage(message));
		await emitEvent(client, Events.MessageDelete, message);
		const deletedMsg = await findMessageById(message.id);
		expect(deletedMsg).toBeNull();
	});
	test.todo('should delete an uncached message');
});

describe('Message Update Tests', () => {
	it('should update a cached edited message', async () => {
		const updatedMessage = copyClass(message, client, {
			content: 'updated',
		});
		await upsertMessage(toAOMessage(message)),
			await emitEvent(client, Events.MessageUpdate, message, updatedMessage);
		const updated = await findMessageById(message.id);
		expect(updated!.content).toBe('updated');
	});
	test.todo('should update an uncached edited message');
});

describe('Message Bulk Delete Tests', () => {
	it('should deleted cached bulk messages', async () => {
		await upsertMessage(toAOMessage(message));
		await emitEvent(
			client,
			Events.MessageBulkDelete,
			new Collection([[message.id, message]]),
			textChannel,
		);

		const deletedMsg = await findMessageById(message.id);
		expect(deletedMsg).toBeNull();
	});
	test.todo('should delete an uncached bulk messages');
});
