import { prisma, upsertDiscordAccount } from '@answeroverflow/db';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { getDiscordUser } from '@answeroverflow/cache';
import type { Adapter, AdapterAccount } from 'next-auth/adapters';
import {
	identifyDiscordAccount,
	linkAnalyticsAccount,
} from '@answeroverflow/analytics';
import { finishAnalyticsCollection } from '@answeroverflow/analytics/src/analytics';

export const extendedAdapter: Adapter = {
	...PrismaAdapter(prisma),
	async linkAccount(account) {
		if (account.provider !== 'discord') {
			throw Error('Unknown account provider');
		}
		if (!account.access_token) {
			throw Error('No access token');
		}
		const discordAccount = await getDiscordUser(account.access_token);
		identifyDiscordAccount(account.userId, {
			id: discordAccount.id,
			username: discordAccount.username,
			email: discordAccount.email ?? '',
		});
		linkAnalyticsAccount({
			answerOverflowAccountId: account.userId,
			otherId: discordAccount.id,
		});
		await finishAnalyticsCollection(); // TODO: Find a better place for this
		await upsertDiscordAccount({
			id: discordAccount.id,
			name: discordAccount.username,
			avatar: discordAccount.avatar,
		});
		return PrismaAdapter(prisma).linkAccount(
			account,
		) as unknown as AdapterAccount;
	},
	async getUserByAccount(providerAccountId) {
		const user = await PrismaAdapter(prisma).getUserByAccount(
			providerAccountId,
		);
		if (!user) {
			return null;
		}
		linkAnalyticsAccount({
			answerOverflowAccountId: user.id,
			otherId: providerAccountId.providerAccountId,
		});
		await finishAnalyticsCollection(); // TODO: Find a better place for this
		return user;
	},
};
