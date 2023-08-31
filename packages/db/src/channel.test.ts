import {
	mockChannel,
	mockChannelWithFlags,
	mockDiscordAccount,
	mockMessage,
	mockServer,
	mockThread,
} from '@answeroverflow/db-mock';
import {
	addFlagsToChannel,
	bitfieldToChannelFlags,
	type Server,
} from '@answeroverflow/prisma-types';
import { getRandomId } from '@answeroverflow/utils';
import {
	createChannel,
	createManyChannels,
	deleteChannel,
	findChannelById,
	findChannelByInviteCode,
	findManyChannelsById,
	findLatestArchivedTimestampByChannelId,
	updateChannel,
	updateManyChannels,
	upsertChannel,
	upsertManyChannels,
	findChannelsBeforeArchivedTimestamp,
} from './channel';
import { createDiscordAccount } from './discord-account';
import { findMessageById, upsertMessage } from './message';
import { createServer } from './server';
import { beforeEach } from 'vitest';

let server: Server;
beforeEach(async () => {
	server = mockServer();
	await createServer(server);
});

describe('Channel Operations', () => {
	describe('Find channel by id', () => {
		it('should find channel by id', async () => {
			const chnl = mockChannel(server);
			await createChannel(chnl);
			const found = await findChannelById(chnl.id);
			expect(found).toStrictEqual(addFlagsToChannel(chnl));
		});
		it('should return null if channel not found', async () => {
			const found = await findChannelById(getRandomId());
			expect(found).toBeNull();
		});
	});
	describe('Find channel by invite code', () => {
		it('should find channel by invite code', async () => {
			const chnl = mockChannel(server, {
				inviteCode: getRandomId(5),
			});
			await createChannel({
				...chnl,
				flags: {
					indexingEnabled: true,
				},
			});
			const found = await findChannelByInviteCode(chnl.inviteCode!);
			expect(found!.id).toBe(chnl.id);
		});
		it('should return null if channel not found', async () => {
			const found = await findChannelByInviteCode(getRandomId(5));
			expect(found).toBeNull();
		});
	});
	describe('Find many channels by id', () => {
		it('should find many channels by id', async () => {
			const chnl1 = mockChannel(server);
			const chnl2 = mockChannel(server);
			await createChannel(chnl1);
			await createChannel(chnl2);
			const found = await findManyChannelsById([chnl1.id, chnl2.id]);
			expect(found).toHaveLength(2);
			expect(found).toContainEqual(addFlagsToChannel(chnl1));
			expect(found).toContainEqual(addFlagsToChannel(chnl2));
		});
		it('should return empty array if no channels found', async () => {
			const found = await findManyChannelsById([getRandomId(), getRandomId()]);
			expect(found).toHaveLength(0);
		});
	});
	describe('Find youngest archived thread', () => {
		it('should find youngest archived thread', async () => {
			const chnl = mockChannel(server);
			const thread1 = mockThread({
				...chnl,
				archivedTimestamp: BigInt(new Date().getTime()),
			});
			const thread2 = mockThread({
				...chnl,
				archivedTimestamp: BigInt(new Date().getTime() + 1000),
			});

			await createChannel(chnl);
			await createChannel(thread1);
			await createChannel(thread2);
			const found = await findLatestArchivedTimestampByChannelId(chnl.id);
			expect(found).toEqual(thread2.archivedTimestamp);
		});
	});
	describe('Channel Create', () => {
		it('should create channel', async () => {
			const chnl = mockChannelWithFlags(server, {
				flags: {
					autoThreadEnabled: true,
					indexingEnabled: true,
				},
			});
			const created = await createChannel(chnl);
			expect(created).toStrictEqual(chnl);
			const found = await findChannelById(chnl.id);
			expect(found).toStrictEqual(chnl);
		});
	});
	describe('Create Many Channels', () => {
		it('should create many channels', async () => {
			const chnl1 = mockChannel(server);
			const chnl2 = mockChannel(server);
			const created = await createManyChannels([chnl1, chnl2]);
			expect(created).toHaveLength(2);
			const found = await findManyChannelsById([chnl1.id, chnl2.id]);
			expect(found).toHaveLength(2);
		});
	});
	describe('Update Channel', () => {
		it('should update channel without passing in the old settings', async () => {
			const chnl = mockChannelWithFlags(server, {
				inviteCode: getRandomId(5),
			});
			await createChannel(chnl);
			const updated = await updateChannel({
				old: null,
				update: {
					id: chnl.id,
					name: 'new name',
					inviteCode: null,
				},
			});
			expect(updated).toStrictEqual({
				...chnl,
				name: 'new name',
				inviteCode: null,
			});
			const found = await findChannelById(chnl.id);
			expect(found).toStrictEqual({
				...chnl,
				name: 'new name',
				inviteCode: null,
			});
		});
		it('should update channel with passing in the old settings', async () => {
			const chnl = mockChannelWithFlags(server, {
				flags: {
					indexingEnabled: true,
				},
			});
			const target = mockChannelWithFlags(server, {
				...chnl,
				name: 'new name',
				flags: {
					indexingEnabled: true,
					markSolutionEnabled: true,
					sendMarkSolutionInstructionsInNewThreads: true,
				},
			});
			await createChannel(chnl);
			const updated = await updateChannel({
				old: chnl,
				update: {
					id: chnl.id,
					name: 'new name',
					flags: {
						markSolutionEnabled: true,
						sendMarkSolutionInstructionsInNewThreads: true,
					},
				},
			});
			expect(updated).toStrictEqual(target);
			const found = await findChannelById(chnl.id);
			expect(found).toStrictEqual(target);
		});
		it('should clear the invite of a channel when setting indexing to disabled', async () => {
			const chnl = mockChannelWithFlags(server, {
				inviteCode: getRandomId(5),
				flags: {
					indexingEnabled: true,
				},
			});
			await createChannel(chnl);
			await updateChannel({
				old: chnl,
				update: {
					id: chnl.id,
					flags: {
						indexingEnabled: false,
					},
				},
			});
			const found = await findChannelById(chnl.id);
			expect(found!.inviteCode).toBeNull();
		});
		it('should update a channel with a thread', async () => {
			const chnl = mockChannelWithFlags(server, {
				flags: {
					autoThreadEnabled: true,
				},
			});
			const thread = mockThread(chnl);
			await createChannel(chnl);
			await createChannel(thread);
			const updated = await updateChannel({
				old: chnl,
				update: {
					id: chnl.id,
					flags: {
						autoThreadEnabled: false,
					},
				},
			});
			expect(updated.flags.autoThreadEnabled).toBeFalsy();
			const found = await findChannelById(chnl.id);
			expect(found!.flags.autoThreadEnabled).toBeFalsy();
		});
	});
	describe('Update Many Channels', () => {
		it('should update many channels', async () => {
			const chnl1 = mockChannelWithFlags(server);
			const chnl2 = mockChannelWithFlags(server);
			await createChannel(chnl1);
			await createChannel(chnl2);
			await updateManyChannels([
				{
					...chnl1,
					name: 'new name',
				},
				{
					...chnl2,
					name: 'new name',
				},
			]);
			const found = await findManyChannelsById([chnl1.id, chnl2.id]);
			expect(found).toHaveLength(2);
			expect(found).toContainEqual({
				...chnl1,
				name: 'new name',
			});
			expect(found).toContainEqual({
				...chnl2,
				name: 'new name',
			});
		});
	});
	describe('Delete Channel', () => {
		it('should delete channel', async () => {
			const chnl = mockChannel(server);
			await createChannel(chnl);
			await deleteChannel(chnl.id);
			const found = await findChannelById(chnl.id);
			expect(found).toBeNull();
		});
		it('should delete a channel and all of its threads', async () => {
			const chnl = mockChannel(server);
			const thread = mockThread(chnl);
			await createChannel(chnl);
			await createChannel(thread);
			await deleteChannel(chnl.id);
			const found = await findChannelById(thread.id);
			expect(found).toBeNull();
		});
		it('should delete all of a channels messages', async () => {
			const chnl = mockChannel(server);
			const author = mockDiscordAccount();
			const msg = mockMessage(server, chnl, author);
			await createDiscordAccount(author);
			await createChannel(chnl);
			await upsertMessage(msg);
			await deleteChannel(chnl.id);
			const found = await findMessageById(msg.id);
			expect(found).toBeNull();
		});
		it('should delete all of a channels threads messages on parent channel delete', async () => {
			const chnl = mockChannel(server);
			const thread = mockThread(chnl);
			const author = mockDiscordAccount();
			const msg = mockMessage(server, thread, author);
			await createDiscordAccount(author);
			await createChannel(chnl);
			await createChannel(thread);
			await upsertMessage(msg);
			await deleteChannel(chnl.id);
			const found = await findMessageById(msg.id);
			expect(found).toBeNull();
		});
	});
	describe('Create channel with deps', () => {
		it('should create a channel and a server together', async () => {
			const srv = mockServer();
			const chnl = mockChannelWithFlags(srv);
			await createServer(srv);
			const created = await createChannel(chnl);
			expect(created).toStrictEqual(chnl);
		});
	});
	describe('Channel Upsert', () => {
		it('should upsert create a channel', async () => {
			const chnl = mockChannelWithFlags(server);
			const created = await upsertChannel({
				create: chnl,
			});
			expect(created).toStrictEqual(chnl);
			const found = await findChannelById(chnl.id);
			expect(found).toStrictEqual(chnl);
		});
		it('should upsert update a channel', async () => {
			const chnl = mockChannelWithFlags(server);
			await createChannel(chnl);
			const updated = await upsertChannel({
				create: chnl,
				update: {
					name: 'new name',
				},
			});
			expect(updated).toStrictEqual({
				...chnl,
				name: 'new name',
			});
			const found = await findChannelById(chnl.id);
			expect(found).toStrictEqual({
				...chnl,
				name: 'new name',
			});
		});
	});

	describe('Channel Upsert Many', () => {
		it('should create many channels', async () => {
			const chnl1 = mockChannel(server);
			const chnl2 = mockChannel(server);

			const created = await upsertManyChannels([
				{
					create: chnl1,
				},
				{
					create: chnl2,
				},
			]);
			expect(created).toHaveLength(2);
			const found = await findManyChannelsById([chnl1.id, chnl2.id]);
			expect(found).toHaveLength(2);
		});
		it('should update many channels', async () => {
			const chnl1 = mockChannel(server);
			const chnl2 = mockChannel(server);
			await createChannel(chnl1);
			await createChannel(chnl2);
			await upsertManyChannels([
				{
					create: chnl1,
					update: {
						name: 'new name',
					},
				},
				{
					create: chnl2,
					update: {
						name: 'new name',
					},
				},
			]);
			const found = await findManyChannelsById([chnl1.id, chnl2.id]);
			expect(found).toHaveLength(2);
			expect(found?.[0]!.name).toBe('new name');
			expect(found?.[1]!.name).toBe('new name');
		});
		it('should create and update many channels', async () => {
			const chnl1 = mockChannel(server);
			const chnl2 = mockChannel(server);
			await createChannel(chnl1);
			await upsertManyChannels([
				{
					create: chnl1,
					update: {
						name: 'new name',
					},
				},
				{
					create: chnl2,
				},
			]);
			const found = await findManyChannelsById([chnl1.id, chnl2.id]);
			expect(found).toHaveLength(2);
			expect(found).toContainEqual(
				addFlagsToChannel({
					...chnl1,
					name: 'new name',
				}),
			);
			expect(found).toContainEqual(addFlagsToChannel(chnl2));
		});
	});

	describe('Channel Find After', () => {
		beforeEach(async () => {
			await upsertChannel({
				create: mockChannel(server, { archivedTimestamp: BigInt(1) }),
			});
			await upsertChannel({
				create: mockChannel(server, { archivedTimestamp: BigInt(2) }),
			});
			await upsertChannel({
				create: mockChannel(server, { archivedTimestamp: BigInt(3) }),
			});
		});
		it('should find before a timestamp', async () => {
			const chnls = await findChannelsBeforeArchivedTimestamp({
				serverId: server.id,
				timestamp: BigInt(4),
			});
			expect(chnls).toHaveLength(3);
		});
		it('shouldnt find anything if no channels before', async () => {
			const chnls = await findChannelsBeforeArchivedTimestamp({
				serverId: server.id,
				timestamp: BigInt(0),
			});
			expect(chnls).toHaveLength(0);
		});
		it('should find from highest to lowest', async () => {
			const chnls = await findChannelsBeforeArchivedTimestamp({
				serverId: server.id,
				timestamp: BigInt(2),
				take: 1,
			});
			expect(chnls).toHaveLength(1);
			expect(chnls[0]!.archivedTimestamp).toBe(BigInt(1));
		});
	});
});

describe('Channel Flags', () => {
	it('should resolve enable indexing on correctly', () => {
		expect(bitfieldToChannelFlags(1 << 0).indexingEnabled).toBeTruthy();
	});
	it('should resolve disable indexing on correctly', () => {
		expect(bitfieldToChannelFlags(0).indexingEnabled).toBeFalsy();
	});
	it('should resolve enable mark solution correctly', () => {
		expect(bitfieldToChannelFlags(1 << 1).markSolutionEnabled).toBeTruthy();
	});
	it('should resolve disable mark solution correctly', () => {
		expect(bitfieldToChannelFlags(0).markSolutionEnabled).toBeFalsy();
	});
	it('should resolve enable send mark solution instructions correctly', () => {
		expect(
			bitfieldToChannelFlags(1 << 2).sendMarkSolutionInstructionsInNewThreads,
		).toBeTruthy();
	});
	it('should resolve disable send mark solution instructions correctly', () => {
		expect(
			bitfieldToChannelFlags(0).sendMarkSolutionInstructionsInNewThreads,
		).toBeFalsy();
	});
	it('should resolve auto thread enabled correctly', () => {
		expect(bitfieldToChannelFlags(1 << 3).autoThreadEnabled).toBeTruthy();
	});
	it('should resolve auto thread disabled correctly', () => {
		expect(bitfieldToChannelFlags(0).autoThreadEnabled).toBeFalsy();
	});
	it('should resolve forum guidelines consent enabled correctly', () => {
		expect(
			bitfieldToChannelFlags(1 << 4).forumGuidelinesConsentEnabled,
		).toBeTruthy();
	});
	it('should resolve forum guidelines consent disabled correctly', () => {
		expect(bitfieldToChannelFlags(0).forumGuidelinesConsentEnabled).toBeFalsy();
	});
});
