import { accounts, db, users, verificationTokens } from '@answeroverflow/db';
import { getDiscordUser } from '@answeroverflow/cache';
import { sessions, tenantSessions } from '@answeroverflow/db/src/schema';
import { upsertDiscordAccount } from '@answeroverflow/db/src/discord-account';
import { and, eq } from 'drizzle-orm';
import type { Adapter } from '@auth/core/adapters';

export const extendedAdapter: Adapter = {
	async createUser(data) {
		const id = crypto.randomUUID();

		await db.insert(users).values({
			id,
			...data,
		});

		return await db
			.select()
			.from(users)
			.where(eq(users.id, id))
			.then((res) => res[0]!);
	},
	async getUser(data) {
		const thing =
			(await db
				.select()
				.from(users)
				.where(eq(users.id, data))
				.then((res) => res[0])) ?? null;

		return thing;
	},
	async getUserByEmail(data) {
		const user =
			(await db
				.select()
				.from(users)
				.where(eq(users.email, data))
				.then((res) => res[0])) ?? null;

		return user;
	},
	async createSession(data) {
		await db.insert(sessions).values({
			id: crypto.randomUUID(),
			...data,
		});
		return await db
			.select()
			.from(sessions)
			.where(eq(sessions.sessionToken, data.sessionToken))
			.then((res) => res[0]!);
	},
	async getSessionAndUser(data) {
		const sessionAndUser =
			(await db
				.select({
					session: sessions,
					user: users,
				})
				.from(sessions)
				.where(eq(sessions.sessionToken, data))
				.innerJoin(users, eq(users.id, sessions.userId))
				.then((res) => res[0])) ?? null;

		return sessionAndUser;
	},
	async updateUser(data) {
		if (!data.id) {
			throw new Error('No user id.');
		}

		await db.update(users).set(data).where(eq(users.id, data.id));

		return await db
			.select()
			.from(users)
			.where(eq(users.id, data.id))
			.then((res) => res[0]!);
	},
	async updateSession(data) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { userId, sessionToken, ...rest } = data;

		await db
			.update(sessions)
			.set(data)
			.where(eq(sessions.sessionToken, data.sessionToken));
		const updated = await db.query.sessions.findFirst({
			where: eq(sessions.sessionToken, data.sessionToken),
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
		await db.insert(accounts).values({
			id: crypto.randomUUID(),
			...rawAccount,
		});
	},
	async getUserByAccount(account) {
		const dbAccount =
			(await db
				.select()
				.from(accounts)
				.where(
					and(
						eq(accounts.providerAccountId, account.providerAccountId),
						eq(accounts.provider, account.provider),
					),
				)
				.leftJoin(users, eq(accounts.userId, users.id))
				.then((res) => res[0])) ?? null;

		if (!dbAccount) {
			return null;
		}

		return dbAccount.User;
	},
	async deleteSession(sessionToken) {
		await db
			.delete(tenantSessions)
			.where(eq(tenantSessions.sessionToken, sessionToken));
		await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
	},
	async createVerificationToken(token) {
		await db.insert(verificationTokens).values(token);

		return await db
			.select()
			.from(verificationTokens)
			.where(eq(verificationTokens.identifier, token.identifier))
			.then((res) => res[0]);
	},
	async useVerificationToken(token) {
		try {
			const deletedToken =
				(await db
					.select()
					.from(verificationTokens)
					.where(
						and(
							eq(verificationTokens.identifier, token.identifier),
							eq(verificationTokens.token, token.token),
						),
					)
					.then((res) => res[0])) ?? null;

			await db
				.delete(verificationTokens)
				.where(
					and(
						eq(verificationTokens.identifier, token.identifier),
						eq(verificationTokens.token, token.token),
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
			.from(users)
			.where(eq(users.id, id))
			.then((res) => res[0] ?? null);

		await db.delete(users).where(eq(users.id, id));

		return user;
	},
	async unlinkAccount(account) {
		await db
			.delete(accounts)
			.where(
				and(
					eq(accounts.providerAccountId, account.providerAccountId),
					eq(accounts.provider, account.provider),
				),
			);

		return undefined;
	},
};
