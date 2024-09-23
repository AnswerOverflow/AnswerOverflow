import { ChannelType } from 'discord-api-types/v10';
import {
	upsertManyMessages,
	upsertServer,
	upsertChannel,
	upsertDiscordAccount,
} from '../index';
import {
	mockDiscordAccount,
	mockMessage,
	mockThread,
	mockServerWithFlags,
	mockChannelWithFlags,
} from '@answeroverflow/db-mock';

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
	messages.push(
		mockMessage(server, thread, account, {
			id: '100',
			parentChannelId: channel.id,
			content:
				'Can you make sure that your internal address is composed of http://ip:port, ',
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

void (async () => {
	console.log('Seeding the database...');
	await seedOne();
	await seedTwo();
	console.log('Database seeded!');
})();
