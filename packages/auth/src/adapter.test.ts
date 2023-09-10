import { extendedAdapter } from './adapter';
import type { z } from 'zod';
import type { zUserSchema } from '@answeroverflow/cache';
import { db } from '@answeroverflow/db';
import { getRandomEmail, getRandomId } from '@answeroverflow/utils';
import { and, eq } from 'drizzle-orm';
import { accounts, discordAccounts } from '@answeroverflow/db/src/schema';
let mockDiscordAccount: z.infer<typeof zUserSchema>;
beforeEach(() => {
	vitest.mock('@answeroverflow/cache', () => ({
		getDiscordUser: vitest.fn(() => {
			return mockDiscordAccount;
		}),
	}));
	mockDiscordAccount = {
		id: getRandomId(),
		username: 'TestUser',
		avatar: '1234567890',
		discriminator: '1234',
		publicFlags: 0,
		flags: 0,
		locale: 'en-US',
		mfaEnabled: false,
		email: getRandomEmail(),
		verified: true,
		bot: false,
	};
});

describe('Discord Auth', () => {
	// This is the first time we have ever seen this user, we need to generate information for them
	it('should create a Discord user for a new account', async () => {
		const createdUser = await extendedAdapter.createUser!({
			email: mockDiscordAccount.email!,
			emailVerified: null,
		});
		await extendedAdapter.linkAccount!({
			provider: 'discord',
			providerAccountId: mockDiscordAccount.id,
			type: 'oauth',
			userId: createdUser.id,
			access_token: '1234567890',
		});
		const user = await db.query.discordAccounts.findFirst({
			where: eq(accounts.id, mockDiscordAccount.id),
		});
		expect(user).toEqual({
			id: mockDiscordAccount.id,
			name: mockDiscordAccount.username,
			avatar: mockDiscordAccount.avatar,
		});
	});
	// We have first seen their account on Discord from indexing their messages, we are linking their indexed account to what was signed in with
	it('should link to a Discord user for an existing account', async () => {
		await db.insert(discordAccounts).values({
			id: mockDiscordAccount.id,
			name: mockDiscordAccount.username,
			avatar: mockDiscordAccount.avatar,
		});
		const createdUser = await extendedAdapter.createUser!({
			email: mockDiscordAccount.email!,
			emailVerified: null,
		});
		await extendedAdapter.linkAccount!({
			provider: 'discord',
			providerAccountId: mockDiscordAccount.id,
			type: 'oauth',
			userId: createdUser.id,
			access_token: '1234567890',
		});
		const user = await db.query.discordAccounts.findFirst({
			where: eq(accounts.id, mockDiscordAccount.id),
		});
		expect(user).toEqual({
			id: mockDiscordAccount.id,
			name: mockDiscordAccount.username,
			avatar: mockDiscordAccount.avatar,
		});
		const account = await db.query.accounts.findFirst({
			where: and(
				eq(accounts.provider, 'discord'),
				eq(accounts.providerAccountId, mockDiscordAccount.id),
			),
		});
		expect(account?.providerAccountId).toBe(mockDiscordAccount.id);
	});
});
