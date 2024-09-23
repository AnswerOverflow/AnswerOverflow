import { getDefaultUserServerSettings } from './serverUtils';
import { getRandomId } from '@answeroverflow/utils/id';
import { db } from '../db';
import { dbChannels, dbServers, dbUserServerSettings } from '../schema';
import { createServer } from '../server';
import { createDiscordAccount } from '../discord-account';
import { and, eq } from 'drizzle-orm';
import { getDefaultChannel } from './channelUtils';
import { describe, expect, it } from "bun:test";
describe('Default Channel Values', () => {
	it('should verify channel default values are correct', async () => {
		const serverId = getRandomId();
		const channelId = getRandomId();
		await db.insert(dbServers).values({
			id: serverId,
			name: 'test',
		});
		await db.insert(dbChannels).values({
			name: 'test',
			type: 0,
			serverId: serverId,
			id: channelId,
		});

		const expectedDefaults = await db
			.select()
			.from(dbChannels)
			.where(eq(dbChannels.id, channelId))
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
		await db.insert(dbUserServerSettings).values({
			serverId,
			userId,
		});
		const expectedDefaults = await db
			.select()
			.from(dbUserServerSettings)
			.where(
				and(
					eq(dbUserServerSettings.serverId, serverId),
					eq(dbUserServerSettings.userId, userId),
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
