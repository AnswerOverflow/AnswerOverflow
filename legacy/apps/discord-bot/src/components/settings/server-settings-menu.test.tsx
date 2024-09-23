import React from 'react';
import {
	createServer,
	findServerById,
	type ServerWithFlags,
	updateServer,
} from '@answeroverflow/db';
import type { Client, Guild, TextChannel } from 'discord.js';
import {
	createGuildMemberVariants,
	type GuildMemberVariants,
	mockGuild,
	mockTextChannel,
} from '@answeroverflow/discordjs-mock';
import {
	ENABLE_READ_THE_RULES_CONSENT_LABEL,
	DISABLE_READ_THE_RULES_CONSENT_LABEL,
	ENABLE_CONSIDER_ALL_MESSAGES_PUBLIC_LABEL,
	DISABLE_CONSIDER_ALL_MESSAGES_PUBLIC_LABEL,
	DISABLE_ANONYMIZE_MESSAGES_LABEL,
	ENABLE_ANONYMIZE_MESSAGES_LABEL,
} from '@answeroverflow/constants';
import {
	mockReply,
	toggleButtonTest,
} from '../../../test/discordjs-react-utils';
import { setupAnswerOverflowBot } from '../../../test/sapphire-mock';
import { toAOServer } from '../../utils/conversions';
import { ServerSettingsMenu } from './server-settings-menu';

let textChannel: TextChannel;
let guild: Guild;
let members: GuildMemberVariants;
let server: ServerWithFlags;
let client: Client;
beforeEach(async () => {
	client = await setupAnswerOverflowBot();
	guild = mockGuild(client);
	members = await createGuildMemberVariants(client, guild);
	textChannel = mockTextChannel(client, guild);
	server = await createServer(toAOServer(guild));
});

describe('Server Settings Menu', () => {
	describe('Toggle Read The Rules Consent Button', () => {
		it('should enable read the rules consent', async () => {
			const message = await mockReply({
				content: <ServerSettingsMenu server={server} />,
				channel: textChannel,
				member: members.guildMemberOwner,
			});
			await toggleButtonTest({
				clicker: members.guildMemberOwner.user,
				preClickLabel: ENABLE_READ_THE_RULES_CONSENT_LABEL,
				postClickLabel: DISABLE_READ_THE_RULES_CONSENT_LABEL,
				message: message,
			});
			const updated = await findServerById(server.id);
			expect(updated!.flags.readTheRulesConsentEnabled).toBeTruthy();
		});
		it('should disable read the rules consent', async () => {
			const updated = await updateServer({
				existing: null,
				update: {
					id: server.id,
					flags: {
						readTheRulesConsentEnabled: true,
					},
				},
			});
			const message = await mockReply({
				content: <ServerSettingsMenu server={updated} />,
				channel: textChannel,
				member: members.guildMemberOwner,
			});
			await toggleButtonTest({
				clicker: members.guildMemberOwner.user,
				preClickLabel: DISABLE_READ_THE_RULES_CONSENT_LABEL,
				postClickLabel: ENABLE_READ_THE_RULES_CONSENT_LABEL,
				message: message,
			});
			const updated2 = await findServerById(server.id);
			expect(updated2!.flags.readTheRulesConsentEnabled).toBeFalsy();
		});
	});
	describe('Toggle Consider All Messages As Public Button', () => {
		it('should enable consider all messages as public', async () => {
			const message = await mockReply({
				content: <ServerSettingsMenu server={server} />,
				channel: textChannel,
				member: members.guildMemberOwner,
			});
			await toggleButtonTest({
				clicker: members.guildMemberOwner.user,
				preClickLabel: ENABLE_CONSIDER_ALL_MESSAGES_PUBLIC_LABEL,
				postClickLabel: DISABLE_CONSIDER_ALL_MESSAGES_PUBLIC_LABEL,
				message: message,
			});
			const updated = await findServerById(server.id);
			expect(updated!.flags.considerAllMessagesPublic).toBeTruthy();
		});
		it('should disable consider all messages as public', async () => {
			const updated = await updateServer({
				existing: null,
				update: {
					id: server.id,
					flags: {
						considerAllMessagesPublic: true,
					},
				},
			});
			const message = await mockReply({
				content: <ServerSettingsMenu server={updated} />,
				channel: textChannel,
				member: members.guildMemberOwner,
			});
			await toggleButtonTest({
				clicker: members.guildMemberOwner.user,
				preClickLabel: DISABLE_CONSIDER_ALL_MESSAGES_PUBLIC_LABEL,
				postClickLabel: ENABLE_CONSIDER_ALL_MESSAGES_PUBLIC_LABEL,
				message: message,
			});
			const disabled = await findServerById(server.id);
			expect(disabled!.flags.considerAllMessagesPublic).toBeFalsy();
		});
		describe('Toggle Anonymize Messages Button', () => {
			it('should enable anonymize messages', async () => {
				const message = await mockReply({
					content: <ServerSettingsMenu server={server} />,
					channel: textChannel,
					member: members.guildMemberOwner,
				});
				await toggleButtonTest({
					clicker: members.guildMemberOwner.user,
					preClickLabel: ENABLE_ANONYMIZE_MESSAGES_LABEL,
					postClickLabel: DISABLE_ANONYMIZE_MESSAGES_LABEL,
					message: message,
				});
				const updated = await findServerById(server.id);
				expect(updated!.flags.anonymizeMessages).toBeTruthy();
			});
			it('should disable anonymize messages', async () => {
				const updated = await updateServer({
					existing: null,
					update: {
						id: server.id,
						flags: {
							anonymizeMessages: true,
						},
					},
				});
				const message = await mockReply({
					content: <ServerSettingsMenu server={updated} />,
					channel: textChannel,
					member: members.guildMemberOwner,
				});
				await toggleButtonTest({
					clicker: members.guildMemberOwner.user,
					preClickLabel: DISABLE_ANONYMIZE_MESSAGES_LABEL,
					postClickLabel: ENABLE_ANONYMIZE_MESSAGES_LABEL,
					message: message,
				});
				const disabled = await findServerById(server.id);
				expect(disabled!.flags.anonymizeMessages).toBeFalsy();
			});
		});
	});
	// describe("View On Answer Overflow Link", () => {
	//   it("should have a link to the server's page on Answer Overflow", async () => {
	//     const message = await reply(reacord, <ServerSettingsMenu server={server} />);
	//     expect(findLinkByURL(message, `https://answeroverflow.com/c/${server.id}`)).toBeTruthy();
	//   });
	// });
});
