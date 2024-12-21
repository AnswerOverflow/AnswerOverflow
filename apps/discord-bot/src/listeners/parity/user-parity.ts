import {
	findDiscordAccountById,
	updateDiscordAccount,
} from '@answeroverflow/core/discord-account';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, User } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: Events.UserUpdate,
	name: 'Sync On User Update',
})
export class SyncOnUserUpdate extends Listener<typeof Events.UserUpdate> {
	public async run(_: User, updated: User) {
		try {
			const existing = await findDiscordAccountById(updated.id);
			if (!existing) return;
			await updateDiscordAccount({
				id: updated.id,
				avatar: updated.avatar,
				name: updated.displayName,
			});
		} catch (error) {
			console.error('Error in SyncOnUserUpdate:', error);
		}
	}
}
