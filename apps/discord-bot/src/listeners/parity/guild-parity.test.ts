import type { SapphireClient } from '@sapphire/framework';
import { Events, Guild } from 'discord.js';
import {
	mockGuild,
	mockTextChannel,
	mockForumChannel,
	emitEvent,
	copyClass,
} from '@answeroverflow/discordjs-mock';
import { setupAnswerOverflowBot } from '~discord-bot/test/sapphire-mock';
import {
	createServer,
	findManyChannelsById,
	findServerById,
} from '@answeroverflow/db';
import { toAOServer } from '~discord-bot/utils/conversions';

let client: SapphireClient;
let guild: Guild;

beforeEach(async () => {
	client = await setupAnswerOverflowBot();
	guild = mockGuild(client);
});

describe('Guild Parity', () => {
	describe('Join', () => {
		it('should sync a servers name on join', async () => {
			await emitEvent(client, Events.GuildCreate, guild);
			const createdServer = await findServerById(guild.id);
			expect(createdServer?.name).toBe(guild.name);
		});
		it('should sync a servers icon on join', async () => {
			await emitEvent(client, Events.GuildCreate, guild);
			const createdServer = await findServerById(guild.id);
			expect(createdServer?.icon).toBe(guild.icon);
		});
		it('should sync a servers description on join', async () => {
			await emitEvent(client, Events.GuildCreate, guild);
			const createdServer = await findServerById(guild.id);
			expect(createdServer?.description).toBe(guild.description);
		});
		it('should sync a servers description on join', async () => {
			await emitEvent(client, Events.GuildCreate, guild);
			const createdServer = await findServerById(guild.id);
			expect(createdServer?.description).toBe(guild.description);
		});
		it('should sync a servers channels on join', async () => {
			const a = mockTextChannel(client, guild);
			const b = mockForumChannel(client, guild);
			await emitEvent(client, Events.GuildCreate, guild);
			const createdChannels = await findManyChannelsById([a.id, b.id]);
			expect(createdChannels).toHaveLength(2);
		});
		it('should update an existing server on join', async () => {
			await emitEvent(client, Events.GuildCreate, guild);
			const createdServer = await findServerById(guild.id);
			expect(createdServer).toBeDefined();
			expect(createdServer?.name).toBe(guild.name);
			const newName = 'new name';
			guild.name = newName;
			await emitEvent(client, Events.GuildCreate, guild);
			const updatedServer = await findServerById(guild.id);
			expect(updatedServer).toBeDefined();
			expect(updatedServer?.name).toBe(newName);
		});
		it('should clear the kick status of a server on join', async () => {
			await createServer({
				...toAOServer(guild),
				kickedTime: new Date(),
			});
			await emitEvent(client, Events.GuildCreate, guild);
			const createdServer = await findServerById(guild.id);
			expect(createdServer?.kickedTime).toBeNull();
		});
	});
	describe('Leave', () => {
		it('should set the kick status of a server on leave', async () => {
			await emitEvent(client, Events.GuildCreate, guild);
			const createdServer = await findServerById(guild.id);
			expect(createdServer?.kickedTime).toBeNull();

			await emitEvent(client, Events.GuildDelete, guild);
			const deletedServer = await findServerById(guild.id);
			expect(deletedServer?.kickedTime?.getUTCDate()).toBeCloseTo(
				new Date().getUTCDate(),
			);
		});
		it("should create a server on leave if it doesn't exist", async () => {
			await emitEvent(client, Events.GuildDelete, guild);
			const deletedServer = await findServerById(guild.id);
			expect(deletedServer).toBeDefined();
			expect(deletedServer?.name).toBe(guild.name);
			expect(deletedServer?.kickedTime?.getUTCDate()).toBeCloseTo(
				new Date().getUTCDate(),
			);
		});
	});
	describe('Update', () => {
		it('should sync a servers name on update', async () => {
			await emitEvent(client, Events.GuildCreate, guild);
			const createdServer = await findServerById(guild.id);
			expect(createdServer).toBeDefined();
			expect(createdServer?.name).toBe(guild.name);

			const newGuild = copyClass(guild, client, { name: 'new name' });
			await emitEvent(client, Events.GuildUpdate, guild, newGuild);
			const updatedServer = await findServerById(guild.id);
			expect(updatedServer).toBeDefined();
			expect(updatedServer?.name).toBe('new name');
		});
		it('should sync a servers icon on update', async () => {
			await emitEvent(client, Events.GuildCreate, guild);
			const createdServer = await findServerById(guild.id);
			expect(createdServer).toBeDefined();
			expect(createdServer?.icon).toBe(guild.icon);

			const newGuild = copyClass(guild, client, { icon: 'new icon' });
			await emitEvent(client, Events.GuildUpdate, guild, newGuild);
			const updatedServer = await findServerById(guild.id);
			expect(updatedServer).toBeDefined();
			expect(updatedServer?.icon).toBe('new icon');
		});
		it('should sync a servers description on update', async () => {
			await emitEvent(client, Events.GuildCreate, guild);
			const createdServer = await findServerById(guild.id);
			expect(createdServer).toBeDefined();
			expect(createdServer?.description).toBe(guild.description);

			const newGuild = copyClass(guild, client, {
				description: 'new description',
			});
			await emitEvent(client, Events.GuildUpdate, guild, newGuild);
			const updatedServer = await findServerById(guild.id);
			expect(updatedServer).toBeDefined();
			expect(updatedServer?.description).toBe('new description');
		});
		it("should create a server on update if it doesn't exist", async () => {
			const newName = 'new name';
			const newGuild = copyClass(guild, client, { name: 'new name' });
			await emitEvent(client, Events.GuildUpdate, guild, newGuild);
			const updatedServer = await findServerById(guild.id);
			expect(updatedServer).toBeDefined();
			expect(updatedServer?.name).toBe(newName);
		});
	});
});
