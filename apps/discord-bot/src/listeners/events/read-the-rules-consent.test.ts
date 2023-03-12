import { Client, Events } from 'discord.js';
import { toAOServer } from '~discord-bot/utils/conversions';
import {
	type GuildMemberVariants,
	createGuildMemberVariants,
	copyClass,
	emitEvent,
	mockGuild,
	mockGuildMember,
	delay,
} from '@answeroverflow/discordjs-mock';
import { setupAnswerOverflowBot } from '~discord-bot/test/sapphire-mock';
import { createServer, findUserServerSettingsById } from '@answeroverflow/db';

let client: Client;
let members: GuildMemberVariants;
beforeEach(async () => {
	client = await setupAnswerOverflowBot();
	members = await createGuildMemberVariants(client);
});

describe('Read the rules consent', () => {
	it('should mark a pending user as consenting in a server with read the rules consent enabled', async () => {
		// setup
		await createServer({
			...toAOServer(members.pendingGuildMemberDefault.guild),
			flags: {
				readTheRulesConsentEnabled: true,
			},
		});

		// act
		const fullMember = copyClass(members.pendingGuildMemberDefault, client);
		fullMember.pending = false;
		await emitEvent(
			client,
			Events.GuildMemberUpdate,
			members.pendingGuildMemberDefault,
			fullMember,
		);
		await delay();

		// assert
		const updatedSettings = await findUserServerSettingsById({
			userId: fullMember.id,
			serverId: fullMember.guild.id,
		});

		expect(updatedSettings!.flags.canPubliclyDisplayMessages).toBe(true);
	});
	it('should not mark a pending user as consenting in a server with read the rules consent disabled', async () => {
		// setup

		await createServer({
			...toAOServer(members.pendingGuildMemberDefault.guild),
			flags: {
				readTheRulesConsentEnabled: false,
			},
		});

		// act
		const fullMember = copyClass(members.pendingGuildMemberDefault, client);
		fullMember.pending = false;
		await emitEvent(
			client,
			Events.GuildMemberUpdate,
			members.pendingGuildMemberDefault,
			fullMember,
		);

		// assert
		const updatedSettings = await findUserServerSettingsById({
			userId: fullMember.id,
			serverId: fullMember.guild.id,
		});
		expect(updatedSettings).toBe(null);
	});
	it('should mark multiple users as consenting in a server with read the rules consent enabled', async () => {
		const server = mockGuild(client);
		const members = [
			mockGuildMember({ client, guild: server, data: { pending: true } }),
			mockGuildMember({ client, guild: server, data: { pending: true } }),
		];
		await createServer({
			...toAOServer(server),
			flags: {
				readTheRulesConsentEnabled: true,
			},
		});

		for await (const pendingMember of members) {
			// act
			const fullMember = copyClass(pendingMember, client);
			fullMember.pending = false;
			await emitEvent(
				client,
				Events.GuildMemberUpdate,
				pendingMember,
				fullMember,
			);

			// assert
			const updatedSettings = await findUserServerSettingsById({
				userId: fullMember.id,
				serverId: server.id,
			});
			await delay(1000);
			expect(updatedSettings!.flags.canPubliclyDisplayMessages).toBe(true);
		}
	});
});
