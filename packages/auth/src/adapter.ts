import {
	dbAccounts,
	db,
	dbUsers,
	dbVerificationTokens,
} from '@answeroverflow/db';
import { getDiscordUser } from '@answeroverflow/cache';
import { dbSessions, dbTenantSessions } from '@answeroverflow/db/src/schema';
import { upsertDiscordAccount } from '@answeroverflow/db/src/discord-account';
import { and, eq } from 'drizzle-orm';
import type { Adapter } from '@auth/core/adapters';
import { randomUUID } from 'node:crypto';

// Custom adapter due to published drizzle adapter not matching schema
export const extendedAdapter: Adapter = {
	async createUser(data) {
		const id = randomUUID();

		await db.insert(dbUsers).values({
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
