import type { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import {
	linkAnalyticsAccount,
	finishAnalyticsCollection,
	identifyDiscordAccount,
} from '@answeroverflow/analytics';
import { extendedAdapter } from './adapter';
import { getDiscordUser, refreshAccessToken } from '@answeroverflow/cache';
import {
	findAccountByProviderAccountId,
	updateProviderAuthToken,
	prisma,
} from '@answeroverflow/db';
import { sharedEnvs } from '@answeroverflow/env/shared';
export const authOptions: NextAuthOptions = {
	// Configure one or more authentication providers
	adapter: extendedAdapter,
	providers: [
		DiscordProvider({
			clientId: sharedEnvs.DISCORD_CLIENT_ID,
			clientSecret: sharedEnvs.DISCORD_CLIENT_SECRET,
			authorization:
				'https://discord.com/api/oauth2/authorize?scope=identify+email+guilds',
		}),
		// ...add more providers here
	],
	callbacks: {
		async session({ session, user }) {
			if (session.user) {
				session.user.id = user.id;
			}
			const updateAccountAccessToken = async () => {
				const discord = await prisma.account.findFirst({
					where: {
						provider: 'discord',
						userId: user.id,
					},
				});
				if (!discord) {
					return;
				}
				const hasExpired =
					Date.now() > (discord.expires_at ?? 0) * 1000 ||
					discord.access_token === null;
				if (hasExpired) {
					await refreshAccessToken(discord);
				}
			};
			await updateAccountAccessToken();
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
					});
					identifyDiscordAccount(user.id, {
						id: discordAccount.id,
						username: discordAccount.username,
						email: discordAccount.email ?? '',
					});
				}
				return finishAnalyticsCollection();
			};
			const updateAccountInfo = async () => {
				const foundAccount = await findAccountByProviderAccountId({
					provider: account.provider,
					providerAccountId: account.providerAccountId,
				});
				if (!foundAccount) return;
				return updateProviderAuthToken(account);
			};
			await Promise.all([identifyAccount(), updateAccountInfo()]);
			return true;
		},
	},
};
