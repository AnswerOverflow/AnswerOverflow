import type { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import {
	linkAnalyticsAccount,
	finishAnalyticsCollection,
	identifyDiscordAccount,
} from '@answeroverflow/analytics';
import { extendedAdapter } from './adapter';
import { getDiscordUser, refreshAccessToken } from '@answeroverflow/cache';
import { db } from '@answeroverflow/db';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { and, eq } from 'drizzle-orm';
import { dbAccounts } from '@answeroverflow/db/src/schema';
import {
	findAccountByProviderAccountId,
	updateProviderAuthToken,
} from '@answeroverflow/db/src/auth';
import { getNextAuthCookieName } from './tenant-cookie';

const hostname =
	sharedEnvs.NEXT_PUBLIC_DEPLOYMENT_ENV === 'local'
		? 'localhost'
		: 'answeroverflow.com';

const useSecureCookies = sharedEnvs.NODE_ENV === 'production';

export const authOptions: NextAuthOptions = {
	// Configure one or more authentication providers
	adapter: extendedAdapter as NextAuthOptions['adapter'],
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
				const discord = await db.query.dbAccounts.findFirst({
					where: and(
						eq(dbAccounts.provider, 'discord'),
						eq(dbAccounts.userId, user.id),
					),
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
			try {
				await updateAccountAccessToken();
			} catch (e) {
				// TODO: Should we not create a new session if this fails?
				console.error(`Error updating account access token: ${e as string}`);
			}
			return session;
		},
		// TODO: Ugly
		async signIn({ user, account }) {
			console.log(`Sign in user: ${user.id}`);
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
	cookies: {
		sessionToken: {
			name: getNextAuthCookieName(),
			options: {
				httpOnly: true,
				sameSite: 'lax',
				path: '/',
				domain: '.' + hostname,
				secure: useSecureCookies,
			},
		},
	},
};
