import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, User } from 'discord.js';
import {
	findDiscordAccountById,
	updateDiscordAccount,
} from '@answeroverflow/db';

@ApplyOptions<Listener.Options>({
	event: Events.UserUpdate,
	name: 'Sync On User Update',
})
export class SyncOnUserUpdate extends Listener<typeof Events.UserUpdate> {
	public async run(_: User, updated: User) {
		const existing = await findDiscordAccountById(updated.id);
		if (!existing) return;
		await updateDiscordAccount({
			id: updated.id,
			avatar: updated.avatar,
			name: updated.username,
		});
	}
}
