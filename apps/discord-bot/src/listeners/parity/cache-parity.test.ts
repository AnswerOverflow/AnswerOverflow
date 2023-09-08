import { Client, Events, Guild, GuildMember } from 'discord.js';
import {
	copyClass,
	emitEvent,
	mockGuild,
	mockGuildMember,
} from '@answeroverflow/discordjs-mock';
import { setupAnswerOverflowBot } from '~discord-bot/test/sapphire-mock';
import { createUser, User } from '@answeroverflow/db';
import {
	toAODiscordAccount,
	toDiscordAPIServer,
} from '~discord-bot/utils/conversions';
import {
	getDiscordUser,
	getUserServers,
	updateCachedDiscordUser,
	updateUserServersCache,
} from '@answeroverflow/cache';
import { createDiscordAccount } from '@answeroverflow/db/src/discord-account';
import { _NOT_PROD_createOauthAccountEntry } from '@answeroverflow/db/src/auth';
import { randomId } from '~ui/test/props';
// import { updateUserServersCache } from "@answeroverflow/cache";
let client: Client;
let guild: Guild;
let member: GuildMember;
let user: User;
beforeEach(async () => {
	client = await setupAnswerOverflowBot();
	guild = mockGuild(client);
	member = mockGuildMember({ client, guild });
	user = await createUser({
		email: `test+${randomId()}@test.com`,
	}).then((x) => x!);
	await createDiscordAccount(toAODiscordAccount(member.user));
});

describe('Account Parity', () => {
	describe('Guild member add', () => {
		it('should update the cache when a user joins a server', async () => {
			const oauth = await _NOT_PROD_createOauthAccountEntry({
				discordUserId: member.user.id,
				userId: user.id,
			});
			if (!oauth.access_token) throw new Error('No access token');
			await updateUserServersCache(oauth.access_token, [
				toDiscordAPIServer(member),
			]);
			const userServers = await getUserServers({
				accessToken: oauth.access_token,
			});
			expect(userServers).toEqual([toDiscordAPIServer(member)]);
			const member2 = mockGuildMember({ client, user: member.user });
			await emitEvent(client, Events.GuildMemberAdd, member2);

			const userServers2 = await getUserServers({
				accessToken: oauth.access_token,
			});
			expect(userServers2).toHaveLength(2);
			expect(userServers2).toContainEqual(toDiscordAPIServer(member2));
			expect(userServers2).toContainEqual(toDiscordAPIServer(member));
		});
	});
	describe('Guild member remove', () => {
		it('should update the cache when a user leaves a server', async () => {
			const oauth = await _NOT_PROD_createOauthAccountEntry({
				discordUserId: member.user.id,
				userId: user.id,
			});
			await updateUserServersCache(oauth.access_token!, [
				toDiscordAPIServer(member),
			]);
			const userServers = await getUserServers({
				accessToken: oauth.access_token!,
			});
			expect(userServers).toEqual([toDiscordAPIServer(member)]);

			await emitEvent(client, Events.GuildMemberRemove, member);

			const userServers2 = await getUserServers({
				accessToken: oauth.access_token!,
			});
			expect(userServers2).toHaveLength(0);
		});
	});
	describe('User update', () => {
		it('should update the cache when a user updates their username', async () => {
			const oauth = await _NOT_PROD_createOauthAccountEntry({
				discordUserId: member.user.id,
				userId: user.id,
			});
			await updateCachedDiscordUser(oauth.access_token!, {
				avatar: member.user.avatar,
				discriminator: member.user.discriminator,
				id: member.user.id,
				username: member.user.username,
			});
			const cachedUser = await getDiscordUser({
				accessToken: oauth.access_token!,
			});
			expect(cachedUser.username).toEqual(member.user.username);
			const newUser = copyClass(member.user, member.client, {
				username: 'New User',
			});

			await emitEvent(client, Events.UserUpdate, member.user, newUser);
			const cachedUser2 = await getDiscordUser({
				accessToken: oauth.access_token!,
			});
			expect(cachedUser2.username).toEqual(newUser.username);
		});
	});
});
