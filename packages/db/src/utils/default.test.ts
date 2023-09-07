import { getDefaultUserServerSettings } from './serverUtils';
import { getRandomId } from '@answeroverflow/utils';
import { db } from '../db';
import { channels, servers, userServerSettings } from '../schema';
import { createServer } from '../server';
import { createDiscordAccount } from '../discord-account';
import { and, eq } from 'drizzle-orm';
import { getDefaultChannel } from './channelUtils';

describe('Default Channel Values', () => {
	it('should verify channel default values are correct', async () => {
		const serverId = getRandomId();
		const channelId = getRandomId();
		await db.insert(servers).values({
			id: serverId,
			name: 'test',
		});
		await db.insert(channels).values({
			name: 'test',
			type: 0,
			serverId: serverId,
			id: channelId,
		});

		const expectedDefaults = await db
			.select()
			.from(channels)
			.where(eq(channels.id, channelId))
			.then((res) => res[0]);
		const defaults = getDefaultChannel({
			id: channelId,
			name: 'test',
			type: 0,
			serverId: serverId,
			parentId: null,
		});
		expect(defaults).toEqual(expectedDefaults);
	});
});

describe('Default User Server Settings Values', () => {
	it('should verify user server settings default values are correct', async () => {
		const serverId = getRandomId();
		const userId = getRandomId();
		await createServer({
			id: serverId,
			name: 'test',
		});
		await createDiscordAccount({
			id: userId,
			name: 'test',
		});
		await db
			.insert(userServerSettings)
			.values({
				serverId,
				userId,
			})
			.then((res) => res[0]);
		const expectedDefaults = await db
			.select()
			.from(userServerSettings)
			.where(
				and(
					eq(userServerSettings.serverId, serverId),
					eq(userServerSettings.userId, userId),
				),
			)
			.then((res) => res[0]);

		const defaults = getDefaultUserServerSettings({
			userId,
			serverId,
		});
		expect(defaults).toEqual(expectedDefaults);
	});
});
