import { db } from '@answeroverflow/db';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { getDiscordUser } from '@answeroverflow/cache';
import type { Adapter, AdapterAccount } from 'next-auth/adapters';
import { sessions, tenantSessions } from '@answeroverflow/db/src/schema';
import { upsertDiscordAccount } from '@answeroverflow/db/src/discord-account';
import { eq } from 'drizzle-orm';

export const extendedAdapter: Adapter = {
	...DrizzleAdapter(db),
	async linkAccount(account) {
		if (account.provider !== 'discord') {
			throw Error('Unknown account provider');
		}
		if (!account.access_token) {
			throw Error('No access token');
		}
		const discordAccount = await getDiscordUser({
			accessToken: account.access_token,
		});
		await upsertDiscordAccount({
			id: discordAccount.id,
			name: discordAccount.username,
			avatar: discordAccount.avatar,
		});
		return DrizzleAdapter(db).linkAccount!(
			account,
		) as unknown as AdapterAccount;
	},
	createSession: async (data) => {
		await db.insert(sessions).values(data);
		const created = await db.query.sessions.findFirst({
			where: eq(sessions.sessionToken, data.sessionToken),
		});
		if (!created) throw new Error('Error creating session');
		return created;
	},
	updateSession: async (data) => {
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
	deleteSession: async (sessionToken) => {
		await db
			.delete(tenantSessions)
			.where(eq(tenantSessions.sessionToken, sessionToken));
		await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
	},
};
