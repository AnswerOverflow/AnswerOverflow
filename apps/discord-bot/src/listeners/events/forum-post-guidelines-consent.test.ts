import {
	Client,
	ForumChannel,
	type AnyThreadChannel,
	Message,
	Events,
} from 'discord.js';
import {
	mockForumChannel,
	mockPublicThread,
	mockMessage,
	emitEvent,
} from '@answeroverflow/discordjs-mock';
import { setupAnswerOverflowBot } from '~discord-bot/test/sapphire-mock';
import { toAOChannel, toAOServer } from '~discord-bot/utils/conversions';
import {
	createChannel,
	createServer,
	findUserServerSettingsById,
} from '@answeroverflow/db';

let client: Client;
let forumChannel: ForumChannel;
let forumChannelThread: AnyThreadChannel;
let forumChannelThreadMessage: Message;
beforeEach(async () => {
	client = await setupAnswerOverflowBot();
	forumChannel = mockForumChannel(client);
	forumChannelThread = mockPublicThread({
		client,
		parentChannel: forumChannel,
	});
	forumChannelThreadMessage = mockMessage({
		client,
		channel: forumChannelThread,
	});
	await createServer(toAOServer(forumChannel.guild));
	await createChannel({
		...toAOChannel(forumChannel),
		flags: {
			forumGuidelinesConsentEnabled: true,
		},
	});
});

describe('Forum Post Guidelines Consent Listener', () => {
	it('should provide consent in a forum channel with consent enabled', async () => {
		await emitEvent(client, Events.MessageCreate, forumChannelThreadMessage);
		const updated = await findUserServerSettingsById({
			userId: forumChannelThreadMessage.author.id,
			serverId: forumChannel.guild.id,
		});
		expect(updated!.flags.canPubliclyDisplayMessages).toBeTruthy();
	});
	it('should provide consent in a forum channel for multiple users', async () => {
		const messages = [
			mockMessage({
				client,
				channel: forumChannelThread,
			}),
			mockMessage({
				client,
				channel: forumChannelThread,
			}),
		];
		await Promise.all(
			messages.map((message) =>
				emitEvent(client, Events.MessageCreate, message),
			),
		);
		const updated = await findUserServerSettingsById({
			userId: messages[0]!.author.id,
			serverId: forumChannel.guild.id,
		});
		expect(updated!.flags.canPubliclyDisplayMessages).toBeTruthy();
		const updated2 = await findUserServerSettingsById({
			userId: messages[1]!.author.id,
			serverId: forumChannel.guild.id,
		});
		expect(updated2!.flags.canPubliclyDisplayMessages).toBeTruthy();
	});
});
