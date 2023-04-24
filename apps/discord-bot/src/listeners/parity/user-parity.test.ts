import type { SapphireClient } from '@sapphire/framework';
import { Events } from 'discord.js';
import { copyClass, emitEvent, mockUser } from '@answeroverflow/discordjs-mock';
import { setupAnswerOverflowBot } from '~discord-bot/test/sapphire-mock';
import {
	createDiscordAccount,
	findDiscordAccountById,
} from '@answeroverflow/db';
import { toAODiscordAccount } from '~discord-bot/utils/conversions';

let client: SapphireClient;

beforeEach(async () => {
	client = await setupAnswerOverflowBot();
});

describe('Guild Member Update', () => {
	it('should update an existing user', async () => {
		const oldUser = mockUser(client, {
			username: 'old name',
		});
		await createDiscordAccount(toAODiscordAccount(oldUser));
		const newUser = copyClass(oldUser, client, {
			username: 'new name',
		});
		await emitEvent(client, Events.UserUpdate, oldUser, newUser);
		const updated = await findDiscordAccountById(oldUser.id);
		expect(updated).toBeDefined();
		expect(updated?.name).toBe('new name');
	});
	it("should not update a user that doesn't exist", async () => {
		const oldUser = mockUser(client, {
			username: 'old name',
		});
		const newUser = copyClass(oldUser, client, {
			username: 'new name',
		});
		await emitEvent(client, Events.UserUpdate, oldUser, newUser);
		const updated = await findDiscordAccountById(oldUser.id);
		expect(updated).toBeNull();
	});
});
