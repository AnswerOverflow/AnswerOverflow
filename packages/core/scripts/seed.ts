import { ChannelType } from 'discord-api-types/v10';
import {
	mockChannelWithFlags,
	mockDiscordAccount,
	mockMessage,
	mockServerWithFlags,
	mockThread,
} from '../mock';
import { upsertChannel } from '../src/channel';
import { upsertDiscordAccount } from '../src/discord-account';
import { upsertManyMessages } from '../src/message-node';
import { upsertServer } from '../src/server';

async function seedOne() {
	const server = mockServerWithFlags({
		id: '402',
		flags: {
			anonymizeMessages: false,
			considerAllMessagesPublic: true,
			readTheRulesConsentEnabled: true,
		},
	});
	const channel = mockChannelWithFlags(server, {
		flags: {
			indexingEnabled: true,
			autoThreadEnabled: false,
			forumGuidelinesConsentEnabled: false,
			markSolutionEnabled: true,
			sendMarkSolutionInstructionsInNewThreads: true,
		},
		inviteCode: 'invite-code',
		type: ChannelType.GuildForum,
	});
	const thread = mockThread(channel, {
		type: ChannelType.PublicThread,
	});
	const account = mockDiscordAccount();
	const messagesToMock = 10;
	const messages = Array.from({ length: messagesToMock }, (_, i) =>
		mockMessage(server, thread, account, {
			id: (BigInt(thread.id) + BigInt(i)).toString(),
			parentChannelId: channel.id,
		}),
	);
	await upsertServer({
		create: server,
		update: server,
	});
	await upsertChannel({
		create: channel,
		update: channel,
	});
	await upsertChannel({
		create: thread,
		update: thread,
	});
	await upsertDiscordAccount(account);
	await upsertManyMessages(messages);
}

async function seedTwo() {
	const server = mockServerWithFlags({
		id: '300',
		customDomain: 'tenant:3001',
		flags: {
			anonymizeMessages: false,
			considerAllMessagesPublic: true,
			readTheRulesConsentEnabled: true,
		},
	});
	const channel = mockChannelWithFlags(server, {
		flags: {
			indexingEnabled: true,
			autoThreadEnabled: false,
			forumGuidelinesConsentEnabled: false,
			markSolutionEnabled: true,
			sendMarkSolutionInstructionsInNewThreads: true,
		},
		type: ChannelType.GuildForum,
	});
	const channel2 = mockChannelWithFlags(server, {
		flags: {
			indexingEnabled: true,
			autoThreadEnabled: false,
			forumGuidelinesConsentEnabled: false,
			markSolutionEnabled: true,
			sendMarkSolutionInstructionsInNewThreads: true,
		},
		name: 'Channel 2',
		type: ChannelType.GuildForum,
	});
	const thread = mockThread(channel, {
		type: ChannelType.PublicThread,
	});
	const thread2 = mockThread(channel2, {
		type: ChannelType.PublicThread,
	});
	const account = mockDiscordAccount();
	const messagesToMock = 10;
	const messages = Array.from({ length: messagesToMock }, (_, i) =>
		mockMessage(server, thread, account, {
			id: (BigInt(thread.id) + BigInt(i)).toString(),
			parentChannelId: channel.id,
		}),
	);
	const messages2 = Array.from({ length: messagesToMock }, (_, i) =>
		mockMessage(server, thread2, account, {
			id: (BigInt(thread2.id) + BigInt(i)).toString(),
			parentChannelId: channel2.id,
		}),
	);
	messages.push(
		mockMessage(server, thread, account, {
			id: '100',
			parentChannelId: channel.id,
			content:
				'Can you make sure that your internal address is composed of http://ip:port, ',
		}),
	);
	messages2.push(
		mockMessage(server, thread2, account, {
			id: '400',
			parentChannelId: channel2.id,
			content: 'This is a test message',
		}),
	);
	await upsertChannel({
		create: channel2,
		update: channel2,
	});
	await upsertChannel({
		create: thread2,
		update: thread2,
	});
	await upsertServer({
		create: server,
		update: server,
	});
	await upsertChannel({
		create: channel,
		update: channel,
	});
	await upsertChannel({
		create: thread,
		update: thread,
	});
	await upsertDiscordAccount(account);
	await upsertManyMessages(messages);
	await upsertManyMessages(messages2);
}

void (async () => {
	console.log('Seeding the database...');
	await seedOne();
	await seedTwo();
	console.log('Database seeded!');
})();
