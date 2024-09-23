import {
	mockChannel,
	mockDiscordAccount,
	mockMessage,
	mockServer,
} from '@answeroverflow/db-mock';
import { createServer } from './server';
import { createDiscordAccount } from './discord-account';
import {
	CANNOT_GRANT_CONSENT_TO_PUBLICLY_DISPLAY_MESSAGES_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE,
	countConsentingUsersInManyServers,
	countConsentingUsersInServer,
	createUserServerSettings,
	findUserServerSettingsById,
	updateUserServerSettings,
} from './user-server-settings';
import { findMessageById } from './message';
import { createChannel } from './channel';
import { getRandomId } from '@answeroverflow/utils';
import { DiscordAccount, Server } from './schema';
import {
	addFlagsToUserServerSettings,
	bitfieldToUserServerSettingsFlags,
	UserServerSettingsWithFlags,
} from './utils/userServerSettingsUtils';
import { upsertMessage } from './message-node';

let server: Server;
let account: DiscordAccount;
beforeEach(async () => {
	server = mockServer();
	await createServer(server);
	account = mockDiscordAccount();
	await createDiscordAccount(account);
});

describe('User Server Settings', () => {
	describe('Add Flags To User Server Settings', () => {
		it('should add flags to User Server settings', () => {
			const data = addFlagsToUserServerSettings({
				bitfield: 0,
				serverId: 'serverId',
				userId: 'userId',
				apiKey: null,
				apiCallsUsed: 0,
			});
			expect(data.flags.canPubliclyDisplayMessages).toBe(false);
			expect(data.flags.messageIndexingDisabled).toBe(false);
		});
	});
	describe('Create User Server Settings', () => {
		it('should create user server settings with consent enabled', async () => {
			// setup
			const created = await createUserServerSettings({
				serverId: server.id,
				userId: account.id,
				flags: {
					canPubliclyDisplayMessages: true,
				},
			});
			expect(created.flags.canPubliclyDisplayMessages).toBe(true);
			const found = await findUserServerSettingsById({
				serverId: server.id,
				userId: account.id,
			});
			expect(found!.flags.canPubliclyDisplayMessages).toBe(true);
		});
	});
	describe('Update User Server Settings', () => {
		let existing: UserServerSettingsWithFlags;
		beforeEach(async () => {
			existing = await createUserServerSettings({
				serverId: server.id,
				userId: account.id,
			});
		});
		it('should update user server settings with consent enabled', async () => {
			const updated = await updateUserServerSettings(
				{
					serverId: server.id,
					userId: account.id,
					flags: {
						canPubliclyDisplayMessages: true,
					},
				},
				existing,
			);
			expect(updated.flags.canPubliclyDisplayMessages).toBe(true);
			const found = await findUserServerSettingsById({
				serverId: server.id,
				userId: account.id,
			});
			expect(found!.flags.canPubliclyDisplayMessages).toBe(true);
		});
		it('should disable consent when setting message indexing to false', async () => {
			await updateUserServerSettings(
				{
					serverId: server.id,
					userId: account.id,
					flags: {
						canPubliclyDisplayMessages: true,
					},
				},
				existing,
			);
			const updated = await updateUserServerSettings(
				{
					serverId: server.id,
					userId: account.id,
					flags: {
						messageIndexingDisabled: true,
					},
				},
				null,
			);
			expect(updated.flags.canPubliclyDisplayMessages).toBe(false);
			expect(updated.flags.messageIndexingDisabled).toBe(true);
			const found = await findUserServerSettingsById({
				serverId: server.id,
				userId: account.id,
			});
			expect(found!.flags.canPubliclyDisplayMessages).toBe(false);
			expect(found!.flags.messageIndexingDisabled).toBe(true);
		});
		it('should delete user server messages when setting indexing enabled to false', async () => {
			const chnl = mockChannel(server);
			await createChannel(chnl);
			const msg = mockMessage(server, chnl, account);
			await upsertMessage(msg);
			const createdMsg = await findMessageById(msg.id);
			expect(createdMsg).not.toBe(null);
			const updated = await updateUserServerSettings(
				{
					serverId: server.id,
					userId: account.id,
					flags: {
						messageIndexingDisabled: true,
					},
				},
				null,
			);
			expect(updated.flags.canPubliclyDisplayMessages).toBe(false);
			expect(updated.flags.messageIndexingDisabled).toBe(true);
			const found = await findUserServerSettingsById({
				serverId: server.id,
				userId: account.id,
			});
			expect(found!.flags.canPubliclyDisplayMessages).toBe(false);
			expect(found!.flags.messageIndexingDisabled).toBe(true);
			const deletedMsg = await findMessageById(msg.id);
			expect(deletedMsg).not.toBeDefined();
		});
		it('should throw an error when trying to grant consent when indexing is disabled', async () => {
			await updateUserServerSettings(
				{
					serverId: server.id,
					userId: account.id,
					flags: {
						messageIndexingDisabled: true,
					},
				},
				null,
			);
			await expect(
				updateUserServerSettings(
					{
						serverId: server.id,
						userId: account.id,
						flags: {
							canPubliclyDisplayMessages: true,
						},
					},
					null,
				),
			).rejects.toThrowError(
				CANNOT_GRANT_CONSENT_TO_PUBLICLY_DISPLAY_MESSAGES_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE,
			);
		});
	});
	describe('Count Consenting Users', () => {
		it('should return 0 for no users', async () => {
			const num = await countConsentingUsersInServer(getRandomId());
			expect(num).toBe(0n);
		});
		it('should return 0 for no users with consent', async () => {
			await createUserServerSettings({
				serverId: server.id,
				userId: account.id,
				flags: {
					canPubliclyDisplayMessages: false,
				},
			});
			const num = await countConsentingUsersInServer(server.id);
			expect(num).toBe(0n);
		});
		it('should return 1 for 1 user with consent', async () => {
			await createUserServerSettings({
				serverId: server.id,
				userId: account.id,
				flags: {
					canPubliclyDisplayMessages: true,
				},
			});
			const num = await countConsentingUsersInServer(server.id);
			expect(num).toBe(1n);
		});
		it('should return 0 when every other flag is set', async () => {
			await createUserServerSettings({
				serverId: server.id,
				userId: account.id,
				flags: {
					canPubliclyDisplayMessages: false,
					messageIndexingDisabled: true,
				},
			});
			const num = await countConsentingUsersInServer(server.id);
			expect(num).toBe(0n);
		});
	});
	describe('Count Consenting Users In Many Servers', () => {
		let serverB: Server;
		beforeEach(async () => {
			serverB = await createServer(mockServer());
		});
		it('should return for each server with 1 user with consent', async () => {
			await createUserServerSettings({
				serverId: server.id,
				userId: account.id,
				flags: {
					canPubliclyDisplayMessages: true,
				},
			});
			await createUserServerSettings({
				serverId: serverB.id,
				userId: account.id,
				flags: {
					canPubliclyDisplayMessages: true,
				},
			});
			const num = await countConsentingUsersInManyServers([
				server.id,
				serverB.id,
			]);
			expect(num.get(server.id)).toBe(1n);
			expect(num.get(serverB.id)).toBe(1n);
		});
		it('should return 0 for each server with no users with consent', async () => {
			await createUserServerSettings({
				serverId: server.id,
				userId: account.id,
				flags: {
					canPubliclyDisplayMessages: false,
				},
			});
			await createUserServerSettings({
				serverId: serverB.id,
				userId: account.id,
				flags: {
					canPubliclyDisplayMessages: false,
				},
			});
			const num = await countConsentingUsersInManyServers([
				server.id,
				serverB.id,
			]);
			expect(num.get(server.id)).toBe(0n);
			expect(num.get(serverB.id)).toBe(0n);
		});
	});
});

describe('User Server Settings Flags', () => {
	it('should resolve publicly displaying messages enabled correctly', () => {
		expect(
			bitfieldToUserServerSettingsFlags(1 << 0).canPubliclyDisplayMessages,
		).toBeTruthy();
	});
	it('should resolve publicly displaying messages disabled correctly', () => {
		expect(
			bitfieldToUserServerSettingsFlags(0).canPubliclyDisplayMessages,
		).toBeFalsy();
	});
	it('should resolve message indexing disabled correctly', () => {
		expect(
			bitfieldToUserServerSettingsFlags(1 << 1).messageIndexingDisabled,
		).toBeTruthy();
	});
	it('should resolve message indexing enabled correctly', () => {
		expect(
			bitfieldToUserServerSettingsFlags(0).messageIndexingDisabled,
		).toBeFalsy();
	});
});
