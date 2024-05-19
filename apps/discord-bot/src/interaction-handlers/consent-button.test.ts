import { Client, Events } from 'discord.js';
import {
	emitEvent,
	mockButtonInteraction,
	mockGuild,
	mockGuildMember,
	mockMessage,
	mockTextChannel,
} from '@answeroverflow/discordjs-mock';
import { setupAnswerOverflowBot } from '../../test/sapphire-mock';
import { toAOServer } from '../utils/conversions';
import { createServer, findUserServerSettingsById } from '@answeroverflow/db';

let client: Client;
beforeEach(async () => {
	client = await setupAnswerOverflowBot();
});

describe('Consent Button Handler', () => {
	it('should successfully parse a consent button interaction', async () => {
		const guild = mockGuild(client);
		const caller = mockGuildMember({ client, guild });
		const textChannel = mockTextChannel(client, guild);
		const message = mockMessage({
			client,
			author: caller.user,
			channel: textChannel,
		});
		await createServer(toAOServer(guild));
		const interaction = mockButtonInteraction({
			caller: caller.user,
			message,
			override: {
				custom_id: 'consent:manually-posted-prompt',
			},
		});
		await emitEvent(client, Events.InteractionCreate, interaction);
		const updated = await findUserServerSettingsById({
			serverId: caller.guild.id,
			userId: caller.id,
		});
		expect(updated?.flags.canPubliclyDisplayMessages).toBe(true);
	});
});
