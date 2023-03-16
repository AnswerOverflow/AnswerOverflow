import { prisma } from './prisma';
import { getDefaultChannel, getDefaultUserServerSettings } from './default';
import { getRandomId } from '@answeroverflow/utils';

describe('Default Channel Values', () => {
	it('should verify channel default values are correct', async () => {
		const serverId = getRandomId();
		const channelId = getRandomId();
		await prisma.server.create({
			data: {
				id: serverId,
				name: 'test',
			},
		});
		const expectedDefaults = await prisma.channel.create({
			data: {
				id: channelId,
				name: 'test',
				type: 0,
				serverId: serverId,
			},
		});
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
		await prisma.server.create({
			data: {
				id: serverId,
				name: 'test',
			},
		});
		await prisma.discordAccount.create({
			data: {
				id: userId,
				name: 'test',
			},
		});
		const expectedDefaults = await prisma.userServerSettings.create({
			data: {
				userId,
				serverId,
			},
		});
		const defaults = getDefaultUserServerSettings({
			userId,
			serverId,
		});
		expect(defaults).toEqual(expectedDefaults);
	});
});
