import type { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import {
	linkAnalyticsAccount,
	finishAnalyticsCollection,
	identifyDiscordAccount,
} from '@answeroverflow/analytics';
import { extendedAdapter } from './adapter';
import { getDiscordUser } from '@answeroverflow/cache';
import {
	clearProviderAuthToken,
	findAccountByProviderAccountId,
	updateProviderAuthToken,
} from '@answeroverflow/db';

export const authOptions: NextAuthOptions = {
	// Configure one or more authentication providers
	adapter: extendedAdapter,
	providers: [
		DiscordProvider({
			clientId: process.env.DISCORD_CLIENT_ID,
			clientSecret: process.env.DISCORD_CLIENT_SECRET,
			authorization:
				'https://discord.com/api/oauth2/authorize?scope=identify+email+guilds',
		}),
		// ...add more providers here
	],
	callbacks: {
		session({ session, user }) {
			if (session.user) {
				session.user.id = user.id;
			}
			return session;
		},
		// TODO: Ugly
		async signIn({ user, account }) {
			if (!account) {
				return true;
			}

			const identifyAccount = async () => {
				linkAnalyticsAccount({
					answerOverflowAccountId: user.id,
					otherId: account.providerAccountId,
				});
				if (account?.provider === 'discord' && account?.access_token) {
					const discordAccount = await getDiscordUser({
						accessToken: account.access_token,
						onInvalidToken: () =>
							clearProviderAuthToken({
								provider: account.provider,
								providerAccountId: account.providerAccountId,
							}),
					});
					identifyDiscordAccount(user.id, {
						id: discordAccount.id,
						username: discordAccount.username,
						email: discordAccount.email ?? '',
					});
				}
				return finishAnalyticsCollection();
			};

			const updateAccountAccessToken = async () => {
				const foundAccount = await findAccountByProviderAccountId({
					provider: account.provider,
					providerAccountId: account.providerAccountId,
				});
				if (!foundAccount) return;
				return updateProviderAuthToken(account);
			};

			await Promise.all([identifyAccount(), updateAccountAccessToken()]);
			return true;
		},
	},
};
