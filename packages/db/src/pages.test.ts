import {
	mockServer,
	mockChannel,
	mockDiscordAccount,
	mockMessage,
	mockThread,
} from '@answeroverflow/db-mock';
import { createServer } from './server';
import { createChannel } from './channel';
import { createDiscordAccount } from './discord-account';
import { findServerWithCommunityPageData } from './pages';
import { upsertMessage } from './message';
import { getRandomId } from '@answeroverflow/utils';
import { Channel, DiscordAccount, Server } from './schema';

describe('Page Operations', () => {
	let server: Server;
	let channel: Channel;
	let author: DiscordAccount;
	beforeEach(async () => {
		server = mockServer();
		channel = mockChannel(server);
		author = mockDiscordAccount();
		await createServer(server);
		await createChannel({
			...channel,
			flags: {
				indexingEnabled: true,
			},
		});
		await createDiscordAccount(author);
	});

	describe('Community Page', () => {
		it('should not return private messages', async () => {
			const thread = mockThread(channel);
			const threadMsg = mockMessage(server, thread, author, { id: thread.id });
			await createChannel(thread);
			await upsertMessage(threadMsg);
			const result = await findServerWithCommunityPageData({
				idOrVanityUrl: server.id,
			});
			expect(result).not.toBeNull();
			const { channels } = result!;
			expect(channels).toHaveLength(1);
			const firstChannel = channels[0]!;
			expect(firstChannel.questions).toHaveLength(0);
		});
		it('should not return private channel data', async () => {
			const privateChannel = mockChannel(server);
			const privateShouldNotEqual = await createChannel({
				...privateChannel,
				flags: {
					markSolutionEnabled: true,
					sendMarkSolutionInstructionsInNewThreads: true,
				},
			});
			const result = await findServerWithCommunityPageData({
				idOrVanityUrl: server.id,
			});
			expect(result).not.toBeNull();
			const { channels } = result!;
			expect(channels).toHaveLength(1);
			const firstChannel = channels[0]!;
			expect(firstChannel).not.toEqual(privateShouldNotEqual);
		});
		it('should not return channels with indexing disabled', async () => {
			const disabledChannel = mockChannel(server);
			await createChannel({
				...disabledChannel,
				flags: {
					indexingEnabled: false,
				},
			});
			const result = await findServerWithCommunityPageData({
				idOrVanityUrl: server.id,
			});
			expect(result).not.toBeNull();
			const { channels } = result!;
			expect(channels).toHaveLength(1);
			const firstChannel = channels[0]!;
			expect(firstChannel.channel.id).not.toEqual(disabledChannel.id);
		});
		it('should not return private server data', async () => {
			const privateServer = mockServer();
			const privateShouldNotEqual = await createServer({
				...privateServer,
				flags: {
					readTheRulesConsentEnabled: true,
				},
			});
			const result = await findServerWithCommunityPageData({
				idOrVanityUrl: privateServer.id,
			});
			expect(result).not.toBeNull();
			expect(result!.server).not.toEqual(privateShouldNotEqual);
		});
		it('should return null on not found', async () => {
			const result = await findServerWithCommunityPageData({
				idOrVanityUrl: 'not-found',
			});
			expect(result).toBeNull();
		});
		it('should work for a vanity url', async () => {
			const serverWithVanity = mockServer({
				vanityUrl: `asd+${getRandomId()}`,
			});
			await createServer(serverWithVanity);
			const result = await findServerWithCommunityPageData({
				idOrVanityUrl: serverWithVanity.vanityUrl!,
			});
			expect(result).not.toBeNull();
			expect(result!.server.id).toEqual(serverWithVanity.id);
		});
		it('should work for an id', async () => {
			const result = await findServerWithCommunityPageData({
				idOrVanityUrl: server.id,
			});
			expect(result).not.toBeNull();
			expect(result!.server.id).toEqual(server.id);
		});
	});
});
