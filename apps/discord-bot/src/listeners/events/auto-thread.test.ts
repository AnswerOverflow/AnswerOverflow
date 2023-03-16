import { Client, Events, TextChannel } from 'discord.js';
import {
	mockTextChannel,
	mockMessage,
	mockGuildMember,
	emitEvent,
} from '@answeroverflow/discordjs-mock';
import { setupAnswerOverflowBot } from '~discord-bot/test/sapphire-mock';
import { randomSnowflake } from '@answeroverflow/discordjs-utils';
import { mockPublicThread } from '@answeroverflow/discordjs-mock';
import { createChannel, createServer } from '@answeroverflow/db';
import { toAOServer, toAOChannel } from '~discord-bot/utils/conversions';

let client: Client;
let textChannel: TextChannel;

beforeEach(async () => {
	client = await setupAnswerOverflowBot();
	textChannel = mockTextChannel(client);
});

const succeedCreatingAThread = async () => {
	// Channel with flag enabled
	await createServer(toAOServer(textChannel.guild));
	await createChannel({
		...toAOChannel(textChannel),
		flags: { autoThreadEnabled: true },
	});
	const author = mockGuildMember({ client });
	const message = mockMessage({
		client,
		channel: textChannel,
		author: author.user,
		override: {
			content: 'Message',
		},
	});

	await emitEvent(client, Events.MessageCreate, message);

	expect(message.thread).toBeDefined();
};

describe('Auto thread', () => {
	it('should not create a thread on a channel thread channel', async () => {
		// Make sure that the success case works, then we can test other cases
		await succeedCreatingAThread();

		const channel = mockPublicThread({ client });
		const author = mockGuildMember({ client });
		const message = mockMessage({
			client,
			channel: channel,
			override: {
				content: 'Hey',
			},
			author: author.user,
		});

		await emitEvent(client, Events.MessageCreate, message);

		expect(message.hasThread).toEqual(false);
	});
	it('should not create a thread if the author is a bot', async () => {
		// Make sure that the success case works, then we can test other cases
		await succeedCreatingAThread();
		const author = mockGuildMember({
			client,
			data: {
				user: {
					bot: true,
					id: randomSnowflake().toString(),
				},
			},
		});

		const message = mockMessage({
			client,
			channel: textChannel,
			override: {
				content: 'Hey',
			},
			author: author.user,
		});

		await emitEvent(client, Events.MessageCreate, message);

		expect(message.hasThread).toEqual(false);
	});
	it('should not create if the author is the system', async () => {
		// Make sure that the success case works, then we can test other cases
		await succeedCreatingAThread();

		const author = mockGuildMember({
			client,
			data: {
				user: {
					system: true,
					id: randomSnowflake().toString(),
				},
			},
		});

		const message = mockMessage({
			client,
			channel: textChannel,
			override: {
				content: 'Hey',
			},
			author: author.user,
		});

		await emitEvent(client, Events.MessageCreate, message);

		expect(message.hasThread).toEqual(false);
	});
	it('should not create a thread if it does not have auto thread enabled', async () => {
		// Make sure that the success case works, then we can test other cases
		await succeedCreatingAThread();

		const channel = mockTextChannel(client);

		await createServer(toAOServer(channel.guild));
		await createChannel({
			...toAOChannel(channel),
			flags: { autoThreadEnabled: false },
		});
		const author = mockGuildMember({ client });

		const message = mockMessage({
			client,
			channel: channel,
			override: {
				content: 'Hey',
			},
			author: author.user,
		});

		await emitEvent(client, Events.MessageCreate, message);

		expect(message.hasThread).toEqual(false);
	});

	it('should create a thread', async () => {
		// Make sure that the success case works
		await succeedCreatingAThread();
	});

	it('should use the nickname instead of the username for the thread title', async () => {
		// Make sure that the success case works, then we can test other cases
		await succeedCreatingAThread();
		const channel = mockTextChannel(client);

		await createServer(toAOServer(channel.guild));
		await createChannel({
			...toAOChannel(channel),
			flags: { autoThreadEnabled: true },
		});

		const author = mockGuildMember({
			client,
			guild: channel.guild,

			data: {
				user: {
					username: 'serverUsername',
					id: randomSnowflake().toString(),
				},
				nick: 'serverNickname',
			},
		});
		const message = mockMessage({
			client,
			channel: channel,
			author: author.user,
			override: {
				content: 'test',
			},
		});

		await emitEvent(client, Events.MessageCreate, message);

		expect(message.thread?.name).toEqual(`serverNickname - test`);
	});
	it('should trim the text to no longer than 50 characters', async () => {
		// Make sure that the success case works, then we can test other cases
		await succeedCreatingAThread();

		const channel = mockTextChannel(client);

		await createServer(toAOServer(channel.guild));
		await createChannel({
			...toAOChannel(channel),
			flags: { autoThreadEnabled: true },
		});

		const author = mockGuildMember({
			client,

			data: {
				user: {
					username: 'serverUsername',
					id: randomSnowflake().toString(),
				},
			},
		});
		const message = mockMessage({
			client,
			channel: channel,
			author: author.user,
			override: {
				content: 'a'.repeat(50),
			},
		});

		await emitEvent(client, Events.MessageCreate, message);

		// 30 = 50 - all other characters
		expect(message.thread?.name).toEqual(
			`serverUsername - ${'a'.repeat(30)}...`,
		);
	});
	it('should remove all markdown syntax from title', async () => {
		// Make sure that the success case works, then we can test other cases
		await succeedCreatingAThread();

		const channel = mockTextChannel(client);

		await createServer(toAOServer(channel.guild));
		await createChannel({
			...toAOChannel(channel),
			flags: { autoThreadEnabled: true },
		});

		const author = mockGuildMember({
			client,

			data: {
				user: {
					username: 'serverUsername',
					id: randomSnowflake().toString(),
				},
			},
		});
		const message = mockMessage({
			client,
			channel: channel,
			author: author.user,
			override: {
				content: '**thread title**',
			},
		});

		await emitEvent(client, Events.MessageCreate, message);

		expect(message.thread?.name).toEqual(`serverUsername - thread title`);
	});
});
