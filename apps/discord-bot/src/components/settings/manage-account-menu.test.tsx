import {
	mockReply,
	toggleButtonTest,
} from '~discord-bot/test/discordjs-react-utils';
import React from 'react';
import {
	createDiscordAccount,
	createServer,
	createUserServerSettings,
	deleteDiscordAccount,
	findIgnoredDiscordAccountById,
	findUserServerSettingsById,
	getDefaultUserServerSettingsWithFlags,
	UserServerSettingsWithFlags,
} from '@answeroverflow/db';
import { mockUserServerSettingsWithFlags } from '@answeroverflow/db-mock';
import type { Guild, TextChannel } from 'discord.js';
import { setupAnswerOverflowBot } from '~discord-bot/test/sapphire-mock';
import {
	createGuildMemberVariants,
	GuildMemberVariants,
	mockGuild,
	mockTextChannel,
} from '@answeroverflow/discordjs-mock';
import { ManageAccountMenu } from './manage-account-menu';
import { toAODiscordAccount, toAOServer } from '~discord-bot/utils/conversions';
import {
	DISABLE_INDEXING_LABEL,
	ENABLE_INDEXING_LABEL,
	GLOBALLY_IGNORE_ACCOUNT_LABEL,
	GRANT_CONSENT_LABEL,
	REVOKE_CONSENT_LABEL,
	STOP_IGNORING_ACCOUNT_LABEL,
} from '@answeroverflow/constants';
let textChannel: TextChannel;
let guild: Guild;
let members: GuildMemberVariants;
let defaultSettings: UserServerSettingsWithFlags;
beforeEach(async () => {
	const client = await setupAnswerOverflowBot();
	guild = mockGuild(client);
	members = await createGuildMemberVariants(client, guild);
	textChannel = mockTextChannel(client, guild);
	defaultSettings = getDefaultUserServerSettingsWithFlags({
		serverId: guild.id,
		userId: members.guildMemberOwner.id,
	});
	await createServer(toAOServer(guild));
});

describe('Manage Account Menu', () => {
	describe('Toggle Consent Button', () => {
		it('should enable consent', async () => {
			const message = await mockReply({
				channel: textChannel,
				content: (
					<ManageAccountMenu
						initialSettings={defaultSettings}
						initialIsGloballyIgnored={false}
					/>
				),
				member: members.guildMemberOwner,
			});
			await toggleButtonTest({
				clicker: members.guildMemberOwner.user,
				preClickLabel: GRANT_CONSENT_LABEL,
				postClickLabel: REVOKE_CONSENT_LABEL,
				message: message,
			});
			const updated = await findUserServerSettingsById({
				serverId: guild.id,
				userId: members.guildMemberOwner.id,
			});
			expect(updated?.flags.canPubliclyDisplayMessages).toBeTruthy();
		});
		it('should disable consent', async () => {
			await createDiscordAccount(
				toAODiscordAccount(members.guildMemberOwner.user),
			);
			const initialSettings = await createUserServerSettings(
				mockUserServerSettingsWithFlags({
					serverId: guild.id,
					userId: members.guildMemberOwner.id,
					flags: {
						canPubliclyDisplayMessages: true,
					},
				}),
			);

			const message = await mockReply({
				channel: textChannel,
				content: (
					<ManageAccountMenu
						initialSettings={initialSettings}
						initialIsGloballyIgnored={false}
					/>
				),
				member: members.guildMemberOwner,
			});
			await toggleButtonTest({
				clicker: members.guildMemberOwner.user,
				preClickLabel: REVOKE_CONSENT_LABEL,
				postClickLabel: GRANT_CONSENT_LABEL,
				message: message,
			});
			const updated = await findUserServerSettingsById({
				serverId: guild.id,
				userId: members.guildMemberOwner.id,
			});
			expect(updated?.flags.canPubliclyDisplayMessages).toBeFalsy();
		});
	});
	describe('Toggle Indexing Of User Messages Button', () => {
		it('should enable indexing of user messages', async () => {
			await createDiscordAccount(
				toAODiscordAccount(members.guildMemberOwner.user),
			);
			const initialSettings = await createUserServerSettings(
				mockUserServerSettingsWithFlags({
					serverId: guild.id,
					userId: members.guildMemberOwner.id,
					flags: {
						messageIndexingDisabled: true,
					},
				}),
			);
			const message = await mockReply({
				channel: textChannel,
				content: (
					<ManageAccountMenu
						initialSettings={initialSettings}
						initialIsGloballyIgnored={false}
					/>
				),
				member: members.guildMemberOwner,
			});
			await toggleButtonTest({
				clicker: members.guildMemberOwner.user,
				preClickLabel: ENABLE_INDEXING_LABEL,
				postClickLabel: DISABLE_INDEXING_LABEL,
				message: message,
			});
			const consentButton = message.findButtonByLabel(GRANT_CONSENT_LABEL);
			expect(consentButton?.disabled).toBeFalsy();
			const updated = await findUserServerSettingsById({
				serverId: guild.id,
				userId: members.guildMemberOwner.id,
			});
			expect(updated?.flags.messageIndexingDisabled).toBeFalsy();
		});
		it('should disable indexing of user messages', async () => {
			const message = await mockReply({
				channel: textChannel,
				content: (
					<ManageAccountMenu
						initialSettings={defaultSettings}
						initialIsGloballyIgnored={false}
					/>
				),
				member: members.guildMemberOwner,
			});
			await toggleButtonTest({
				clicker: members.guildMemberOwner.user,
				preClickLabel: DISABLE_INDEXING_LABEL,
				postClickLabel: ENABLE_INDEXING_LABEL,
				message: message,
			});
			const consentButton = message.findButtonByLabel(GRANT_CONSENT_LABEL);
			expect(consentButton?.disabled).toBeTruthy();
			const updated = await findUserServerSettingsById({
				serverId: guild.id,
				userId: members.guildMemberOwner.id,
			});
			expect(updated?.flags.messageIndexingDisabled).toBeTruthy();
		});
	});
	describe('Toggle Globally Ignored Button', () => {
		it('should enable globally ignored', async () => {
			const message = await mockReply({
				channel: textChannel,
				content: (
					<ManageAccountMenu
						initialSettings={defaultSettings}
						initialIsGloballyIgnored={false}
					/>
				),
				member: members.guildMemberOwner,
			});
			await toggleButtonTest({
				preClickLabel: GLOBALLY_IGNORE_ACCOUNT_LABEL,
				postClickLabel: STOP_IGNORING_ACCOUNT_LABEL,
				message: message,
				clicker: members.guildMemberOwner.user,
			});

			const found = await findIgnoredDiscordAccountById(
				members.guildMemberOwner.id,
			);
			expect(found!.id).toBe(members.guildMemberOwner.id);
		});
		it('should disable globally ignored', async () => {
			await deleteDiscordAccount(
				toAODiscordAccount(members.guildMemberOwner.user).id,
			);

			const message = await mockReply({
				channel: textChannel,
				content: (
					<ManageAccountMenu
						initialSettings={defaultSettings}
						initialIsGloballyIgnored={true}
					/>
				),
				member: members.guildMemberOwner,
			});

			await toggleButtonTest({
				clicker: members.guildMemberOwner.user,
				preClickLabel: STOP_IGNORING_ACCOUNT_LABEL,
				postClickLabel: GLOBALLY_IGNORE_ACCOUNT_LABEL,
				message: message,
			});
		});
	});
});
