import { randomUUID } from 'node:crypto';
import { getRandomId } from '@answeroverflow/utils/id';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { Cache } from './cache';
import { db } from './db';
import {
	type Account,
	dbAccounts,
	dbSessions,
	dbTenantSessions,
	dbUsers,
	dbVerificationTokens,
} from './schema';

export async function updateProviderAuthToken(
	input: Pick<Account, 'provider' | 'providerAccountId'> & {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		access_token?: string;
		// eslint-disable-next-line @typescript-eslint/naming-convention
		refresh_token?: string;
		scope?: string;
		// eslint-disable-next-line @typescript-eslint/naming-convention
		expires_at?: number;
		// eslint-disable-next-line @typescript-eslint/naming-convention
		token_type?: string;
		// eslint-disable-next-line @typescript-eslint/naming-convention
		session_state?: string;
		type?: string;
		// eslint-disable-next-line @typescript-eslint/naming-convention
		id_token?: string;
	},
) {
	const { provider, providerAccountId, ...update } = input;

	const zAccountUpdate = z.object({
		// eslint-disable-next-line @typescript-eslint/naming-convention
		access_token: z.string().optional(),
		// eslint-disable-next-line @typescript-eslint/naming-convention
		refresh_token: z.string().optional(),
		scope: z.string().optional(),
		// eslint-disable-next-line @typescript-eslint/naming-convention
		expires_at: z.number().optional(),
		// eslint-disable-next-line @typescript-eslint/naming-convention
		token_type: z.string().optional(),
		// eslint-disable-next-line @typescript-eslint/naming-convention
		session_state: z.string().optional(),
		type: z.enum(['oidc', 'oauth', 'email']).optional(),
		// eslint-disable-next-line @typescript-eslint/naming-convention
		id_token: z.string().optional(),
	});

	await db
		.update(dbAccounts)
		.set(zAccountUpdate.parse(update))
		.where(
			and(
				eq(dbAccounts.provider, provider),
				eq(dbAccounts.providerAccountId, providerAccountId),
			),
		);
}

// todo: move to its own package
//! MAINLY TEST ONLY
export async function _NOT_PROD_createOauthAccountEntry({
	discordUserId,
	userId,
}: {
	discordUserId: string;
	userId: string;
}) {
	await db.insert(dbAccounts).values({
		id: getRandomId(),
		provider: 'discord',
		type: 'oauth',
		providerAccountId: discordUserId,
		userId: userId,
		access_token: getRandomId(),
	});

	const inserted = await db.query.dbAccounts.findFirst({
		where: and(
			eq(dbAccounts.provider, 'discord'),
			eq(dbAccounts.providerAccountId, discordUserId),
		),
	});

	if (!inserted) throw new Error('Failed to insert account');

	return inserted;
}

export async function createUser(input: { id?: string; email: string }) {
	const userId = input.id ?? randomUUID();
	await db.insert(dbUsers).values({
		id: userId,
		email: input.email,
	});
	return db.query.dbUsers.findFirst({
		where: eq(dbUsers.id, userId),
	});
}

import { sharedEnvs } from '@answeroverflow/env/shared';
import type { Adapter } from '@auth/core/adapters';
import { CookieSerializeOptions } from 'cookie';
import { NextApiResponse } from 'next';
import type { NextAuthOptions } from 'next-auth';
import { getServerSession as getNextAuthSession } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { cookies } from 'next/headers';
import { Analytics } from './analytics';
import { upsertDiscordAccount } from './discord-account';

const hostname =
	sharedEnvs.NEXT_PUBLIC_DEPLOYMENT_ENV === 'local'
		? 'localhost'
		: 'answeroverflow.com';

const useSecureCookies = sharedEnvs.NODE_ENV === 'production';

export module Auth {
	export type Session = Awaited<ReturnType<typeof getServerSession>>;

	export async function findAccountByProviderAccountId(input: {
		provider: string;
		providerAccountId: string;
	}) {
		return db
			.select()
			.from(dbAccounts)
			.where(
				and(
					eq(dbAccounts.provider, input.provider),
					eq(dbAccounts.providerAccountId, input.providerAccountId),
				),
			)
			.then((x) => x.at(0));
	}

	export function findTenantSessionByToken(token: string) {
		return db
			.select()
			.from(dbTenantSessions)
			.where(eq(dbTenantSessions.id, token))
			.then((x) => x.at(0));
	}

	export function deleteTenantSessionByToken(token: string) {
		return db.delete(dbTenantSessions).where(eq(dbTenantSessions.id, token));
	}

	export function findDiscordOauthByProviderAccountId(discordId: string) {
		return findAccountByProviderAccountId({
			provider: 'discord',
			providerAccountId: discordId,
		});
	}

	export async function findDiscordOauthByUserId(userId: string) {
		const account = await db.query.dbAccounts.findFirst({
			where: and(
				eq(dbAccounts.userId, userId),
				eq(dbAccounts.provider, 'discord'),
			),
		});
		return account ?? null;
	}

	export const extendedAdapter: Adapter = {
		async createUser(data) {
			const id = randomUUID();

			await db.insert(dbUsers).values({
				// @ts-expect-error idk why this is here
				id,
				...data,
			});

			return await db
				.select()
				.from(dbUsers)
				.where(eq(dbUsers.id, id))
				.then((res) => ({
					...res[0]!,
					email: res[0]?.email ?? '',
				}));
		},
		async getUser(data) {
			const thing =
				(await db
					.select()
					.from(dbUsers)
					.where(eq(dbUsers.id, data))
					.then((res) => res[0])) ?? null;

			return thing
				? {
						...thing,
						email: thing.email ?? '',
					}
				: null;
		},
		async getUserByEmail(data) {
			const user =
				(await db
					.select()
					.from(dbUsers)
					.where(eq(dbUsers.email, data))
					.then((res) => res[0])) ?? null;
			if (!user) return null;
			return {
				...user,
				email: user?.email ?? '',
			};
		},
		async createSession(data) {
			console.log(`Creating session for ${data.userId}`);
			await db.insert(dbSessions).values({
				id: randomUUID(),
				...data,
			});
			return await db
				.select()
				.from(dbSessions)
				.where(eq(dbSessions.sessionToken, data.sessionToken))
				.then((res) => res[0]!);
		},
		async getSessionAndUser(data) {
			const sessionAndUser =
				(await db
					.select({
						session: dbSessions,
						user: dbUsers,
					})
					.from(dbSessions)
					.where(eq(dbSessions.sessionToken, data))
					.innerJoin(dbUsers, eq(dbUsers.id, dbSessions.userId))
					.then((res) => res[0])) ?? null;
			if (!sessionAndUser) return null;
			return {
				session: sessionAndUser.session,
				user: {
					...sessionAndUser?.user,
					email: sessionAndUser?.user?.email ?? '',
				},
			};
		},
		async updateUser(data) {
			if (!data.id) {
				throw new Error('No user id.');
			}

			await db.update(dbUsers).set(data).where(eq(dbUsers.id, data.id));

			return await db
				.select()
				.from(dbUsers)
				.where(eq(dbUsers.id, data.id))
				.then((res) => ({
					...res[0]!,
					email: res[0]?.email ?? '',
				}));
		},
		async updateSession(data) {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { userId, sessionToken, ...rest } = data;

			await db
				.update(dbSessions)
				.set(data)
				.where(eq(dbSessions.sessionToken, data.sessionToken));
			const updated = await db.query.dbSessions.findFirst({
				where: eq(dbSessions.sessionToken, data.sessionToken),
			});
			if (!updated) throw new Error('Error updating session');
			return updated;
		},
		async linkAccount(rawAccount) {
			if (rawAccount.provider !== 'discord') {
				throw Error('Unknown account provider');
			}
			if (!rawAccount.access_token) {
				throw Error('No access token');
			}
			const discordAccount = await getDiscordUser({
				accessToken: rawAccount.access_token,
			});
			await upsertDiscordAccount({
				id: discordAccount.id,
				name: discordAccount.username,
				avatar: discordAccount.avatar,
			});
			await db.insert(dbAccounts).values({
				id: randomUUID(),
				...rawAccount,
			});
		},
		async getUserByAccount(account) {
			const dbAccount =
				(await db
					.select()
					.from(dbAccounts)
					.where(
						and(
							eq(dbAccounts.providerAccountId, account.providerAccountId),
							eq(dbAccounts.provider, account.provider),
						),
					)
					.leftJoin(dbUsers, eq(dbAccounts.userId, dbUsers.id))
					.then((res) => res[0])) ?? null;

			if (!dbAccount) {
				return null;
			}

			return {
				...dbAccount.User,
				email: dbAccount.User!.email ?? '',
				emailVerified: dbAccount.User!.emailVerified ?? null,
				id: dbAccount.User!.id ?? null,
			};
		},
		async deleteSession(sessionToken) {
			await db
				.delete(dbTenantSessions)
				.where(eq(dbTenantSessions.sessionToken, sessionToken));
			await db
				.delete(dbSessions)
				.where(eq(dbSessions.sessionToken, sessionToken));
		},
		async createVerificationToken(token) {
			await db.insert(dbVerificationTokens).values(token);

			return await db
				.select()
				.from(dbVerificationTokens)
				.where(eq(dbVerificationTokens.identifier, token.identifier))
				.then((res) => res[0]);
		},
		async useVerificationToken(token) {
			try {
				const deletedToken =
					(await db
						.select()
						.from(dbVerificationTokens)
						.where(
							and(
								eq(dbVerificationTokens.identifier, token.identifier),
								eq(dbVerificationTokens.token, token.token),
							),
						)
						.then((res) => res[0])) ?? null;

				await db
					.delete(dbVerificationTokens)
					.where(
						and(
							eq(dbVerificationTokens.identifier, token.identifier),
							eq(dbVerificationTokens.token, token.token),
						),
					);

				return deletedToken;
			} catch (err) {
				throw new Error('No verification token found.');
			}
		},
		async deleteUser(id) {
			const user = await db
				.select()
				.from(dbUsers)
				.where(eq(dbUsers.id, id))
				.then((res) => res[0] ?? null);
			if (!user) return null;
			await db.delete(dbUsers).where(eq(dbUsers.id, id));

			return {
				...user,
				email: user?.email ?? '',
			};
		},
		async unlinkAccount(account) {
			await db
				.delete(dbAccounts)
				.where(
					and(
						eq(dbAccounts.providerAccountId, account.providerAccountId),
						eq(dbAccounts.provider, account.provider),
					),
				);

			return undefined;
		},
	};

	export const authOptions: NextAuthOptions = {
		// Configure one or more authentication providers
		adapter: extendedAdapter as NextAuthOptions['adapter'],
		providers: [
			DiscordProvider({
				clientId: sharedEnvs.DISCORD_CLIENT_ID!,
				clientSecret: sharedEnvs.DISCORD_CLIENT_SECRET!,
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
					Analytics.linkAnalyticsAccount({
						answerOverflowAccountId: user.id,
						otherId: account.providerAccountId,
					});
					if (account?.provider === 'discord' && account?.access_token) {
						const discordAccount = await getDiscordUser({
							accessToken: account.access_token,
						});
						Analytics.identifyDiscordAccount(user.id, {
							id: discordAccount.id,
							username: discordAccount.username,
							email: discordAccount.email ?? '',
						});
					}
					return Analytics.finishAnalyticsCollection();
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
					domain:
						sharedEnvs.NEXT_PUBLIC_DEPLOYMENT_ENV === 'production'
							? '.' + hostname
							: undefined,
					secure: useSecureCookies,
				},
			},
		},
	};

	export async function getServerSession() {
		const tenantToken = cookies().get(getTenantCookieName());
		if (tenantToken) {
			const nextAuthSession = await db.query.dbTenantSessions.findFirst({
				where: eq(dbTenantSessions.id, tenantToken.value),
			});

			if (!nextAuthSession) return null;
			const oldCookies = cookies().getAll();
			// hacky
			cookies().getAll = () => {
				return [
					...oldCookies,
					{
						name: getNextAuthCookieName(),
						value: nextAuthSession.sessionToken,
					},
				];
			};
		}
		// TODO: Does next auth early return if no auth cookie is set?
		const session = await getNextAuthSession(authOptions);
		if (!session) return null;
		return {
			...session,
			isTenantSession: !!tenantToken,
		};
	}

	export function getTenantCookieName() {
		return `${
			sharedEnvs.NODE_ENV === 'production' ? '__Host-' : '!'
		}answeroverflow.tenant-token`;
	}

	export function getTenantCookieOptions(
		override?: CookieSerializeOptions,
	): CookieSerializeOptions {
		return {
			httpOnly: true,
			sameSite: 'strict',
			secure: sharedEnvs.NODE_ENV === 'production'!,
			expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 1 month
			domain: '',
			path: '/',
			...override,
		};
	}

	export function getNextAuthCookieName() {
		const cookiePrefix =
			sharedEnvs.NODE_ENV === 'production' ? '__Secure-' : ''!;
		return `${cookiePrefix}next-auth.session-token`;
	}

	export function disableSettingCookies(res: NextApiResponse<any>) {
		// eslint-disable-next-line @typescript-eslint/unbound-method
		const originalSetHeader = res.setHeader;
		res.setHeader = function (name, value) {
			if (name.toLowerCase() === 'set-cookie') {
				return res; // tenant sites don't need to set cookies
			} else {
				return originalSetHeader.call(this, name, value);
			}
		};
	}

	type DiscordApiCallOpts = {
		accessToken: string;
	};
	export async function discordApiFetch(
		url: '/users/@me/guilds' | '/users/@me',
		callOpts: DiscordApiCallOpts,
	) {
		const data = await fetch('https://discordapp.com/api' + url, {
			headers: {
				Authorization: `Bearer ${callOpts.accessToken}`,
			},
			next: {
				revalidate: 600,
			},
		});
		if (data.status === 401) {
			const account = await db.query.dbAccounts.findFirst({
				where: and(
					eq(dbAccounts.provider, 'discord'),
					eq(dbAccounts.access_token, callOpts.accessToken),
				),
			});
			if (!account) {
				throw new Error('Invalid access token');
			}
			await refreshAccessToken(account);
		} else if (data.status !== 200) {
			throw new Error(
				`Invalid response from Discord ${data.status} ${data.statusText}`,
			);
		}
		return data;
	}
	const hoursToSeconds = (hours: number) => hours * 60 * 60;

	/*
	 * Discord Servers
	 */
	export const zDiscordApiServerSchema = z.object({
		id: z.string(),
		name: z.string(),
		icon: z.string().nullable(),
		owner: z.boolean(),
		permissions: z.number(),
		features: z.array(z.string()),
	});
	export const zDiscordApiServerArraySchema = z.array(zDiscordApiServerSchema);
	export type DiscordAPIServerSchema = z.infer<typeof zDiscordApiServerSchema>;

	// TODO: Log cache hits and misses
	const DISCORD_SERVERS_CACHE_TTL_IN_HOURS = 24;
	export function getDiscordServersRedisKey(accessToken: string) {
		return `userServers:${accessToken}`;
	}
	export async function updateUserServersCache(
		accessToken: string,
		servers: DiscordAPIServerSchema[],
	) {
		const client = await Cache.getRedisClient();
		await client.setEx(
			getDiscordServersRedisKey(accessToken),
			hoursToSeconds(DISCORD_SERVERS_CACHE_TTL_IN_HOURS),
			JSON.stringify(servers),
		);
	}

	export async function getUserServers(opts: DiscordApiCallOpts) {
		const client = await Cache.getRedisClient();
		const cachedServers = await client.get(
			getDiscordServersRedisKey(opts.accessToken),
		);
		if (cachedServers) {
			return zDiscordApiServerArraySchema.parse(JSON.parse(cachedServers));
		}
		const data = await discordApiFetch('/users/@me/guilds', opts);
		const servers = zDiscordApiServerArraySchema.parse(await data.json());
		await updateUserServersCache(opts.accessToken, servers);
		return servers;
	}

	export async function removeServerFromUserCache(
		opts: DiscordApiCallOpts & { serverId: string },
	) {
		const cachedServers = await getUserServers(opts);
		if (cachedServers) {
			const filteredServers = cachedServers.filter(
				(server) => server.id !== opts.serverId,
			);
			await updateUserServersCache(opts.accessToken, filteredServers);
		}
	}

	export async function addServerToUserServerCache(
		opts: DiscordApiCallOpts & { server: DiscordAPIServerSchema },
	) {
		const cachedServers = await getUserServers(opts);
		if (cachedServers) {
			await updateUserServersCache(opts.accessToken, [
				...cachedServers,
				opts.server,
			]);
		}
	}

	/*
	 * Discord User
	 */

	// https://discord.com/developers/docs/resources/user#user-object
	export const zUserSchema = z.object({
		id: z.string(),
		username: z.string(),
		discriminator: z.string(),
		avatar: z.string().nullable(),
		bot: z.boolean().optional(),
		system: z.boolean().optional(),
		mfaEnabled: z.boolean().optional(),
		banner: z.string().nullable().optional(),
		accentColor: z.number().optional(),
		locale: z.string().optional(),
		verified: z.boolean().optional(),
		email: z.string().nullable().optional(),
		flags: z.number().optional(),
		premiumType: z.number().optional(),
		publicFlags: z.number().optional(),
	});

	export type DiscordAPIUserSchema = z.infer<typeof zUserSchema>;

	const DISCORD_USER_CACHE_TTL_IN_HOURS = 24;

	export function getDiscordUserRedisKey(accessToken: string) {
		return `discordUser:${accessToken}`;
	}

	export async function updateCachedDiscordUser(
		accessToken: string,
		user: DiscordAPIUserSchema,
	) {
		const client = await Cache.getRedisClient();
		await client.setEx(
			getDiscordUserRedisKey(accessToken),
			hoursToSeconds(DISCORD_USER_CACHE_TTL_IN_HOURS),
			JSON.stringify(user),
		);
		return user;
	}

	export async function getDiscordUser(opts: DiscordApiCallOpts) {
		const client = await Cache.getRedisClient();
		const cachedUser = await client.get(
			getDiscordUserRedisKey(opts.accessToken),
		);
		if (cachedUser) {
			try {
				return zUserSchema.parse(JSON.parse(cachedUser));
			} catch (e) {
				console.log(e);
			}
		}
		const data = await discordApiFetch('/users/@me', opts);
		const parsed = zUserSchema.parse(await data.json());
		await updateCachedDiscordUser(opts.accessToken, parsed);
		return parsed;
	}

	export async function isRefreshTokenBeingUsed(
		refreshToken: string,
	): Promise<boolean> {
		// wait between .1 and .3 seconds incase two requests come in at the same time
		await new Promise((resolve) =>
			setTimeout(resolve, Math.random() * 200 + 100),
		);
		const client = await Cache.getRedisClient();
		const cachedToken = await client.get(`refreshToken:${refreshToken}`);
		return !!cachedToken;
	}

	export async function setRefreshTokenBeingUsed(
		refreshToken: string,
		isBeingUsed: boolean,
	): Promise<void> {
		const client = await Cache.getRedisClient();
		if (isBeingUsed) {
			await client.setEx(`refreshToken:${refreshToken}`, 5, 'true');
			return;
		} else {
			await client.del(`refreshToken:${refreshToken}`);
			return;
		}
	}

	export async function refreshAccessToken(discord: Account) {
		if (!discord.refresh_token) {
			throw new Error('No refresh token');
		}
		const params = new URLSearchParams();
		params.append('client_id', sharedEnvs.DISCORD_CLIENT_ID!);
		params.append('client_secret', sharedEnvs.DISCORD_CLIENT_SECRET!);
		params.append('grant_type', 'refresh_token');
		params.append('refresh_token', discord.refresh_token ?? '');
		try {
			console.log('Fetching new token');
			const inUse = await isRefreshTokenBeingUsed(discord.refresh_token);
			if (inUse) {
				console.log('Token is being used');
				return;
			}
			await setRefreshTokenBeingUsed(discord.refresh_token, true);
			const body = {
				client_id: sharedEnvs.DISCORD_CLIENT_ID!,
				client_secret: sharedEnvs.DISCORD_CLIENT_SECRET!,
				grant_type: 'refresh_token',
				refresh_token: discord.refresh_token ?? '',
			};
			const res = await fetch('https://discord.com/api/v10/oauth2/token', {
				method: 'POST',
				body: JSON.stringify(body),
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});

			const zAccessTokenResponse = z.object({
				token_type: z.string(),
				access_token: z.string(),
				expires_in: z.number(),
				refresh_token: z.string(),
				scope: z.string(),
			});
			const accessTokenResponse = zAccessTokenResponse.parse(await res.json());
			console.log('Updating token');
			await updateProviderAuthToken({
				provider: 'discord',
				providerAccountId: discord.providerAccountId,
				access_token: accessTokenResponse.access_token,
				expires_at:
					Math.floor(Date.now() / 1000) + accessTokenResponse.expires_in,
				refresh_token: accessTokenResponse.refresh_token,
				scope: accessTokenResponse.scope,
				token_type: accessTokenResponse.token_type,
			});
			await setRefreshTokenBeingUsed(discord.refresh_token, false);
		} catch (error) {
			await setRefreshTokenBeingUsed(discord.refresh_token, false);
			// We're in a bad state so just prompt a re-auth
			await db.delete(dbSessions).where(eq(dbSessions.userId, discord.userId));
		}
	}
}
