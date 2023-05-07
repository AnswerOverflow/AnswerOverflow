import {
	mockReply,
	toggleButtonTest,
} from '~discord-bot/test/discordjs-react-utils';
import React from 'react';
import {
	createServer,
	findServerById,
	type ServerWithFlags,
	updateServer,
} from '@answeroverflow/db';
import type { Client, Guild, TextChannel } from 'discord.js';
import { setupAnswerOverflowBot } from '~discord-bot/test/sapphire-mock';
import {
	createGuildMemberVariants,
	type GuildMemberVariants,
	mockGuild,
	mockTextChannel,
} from '@answeroverflow/discordjs-mock';
import { toAOServer } from '~discord-bot/utils/conversions';
import { ServerSettingsMenu } from '~discord-bot/components/settings/server-settings-menu';
import {
	ENABLE_READ_THE_RULES_CONSENT_LABEL,
	DISABLE_READ_THE_RULES_CONSENT_LABEL,
} from '@answeroverflow/constants';

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
	// describe("View On Answer Overflow Link", () => {
	//   it("should have a link to the server's page on Answer Overflow", async () => {
	//     const message = await reply(reacord, <ServerSettingsMenu server={server} />);
	//     expect(findLinkByURL(message, `https://answeroverflow.com/c/${server.id}`)).toBeTruthy();
	//   });
	// });
});
