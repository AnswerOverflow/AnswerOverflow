import { prisma, upsertDiscordAccount } from '@answeroverflow/db';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { getDiscordUser } from '@answeroverflow/cache';
import type { Adapter, AdapterAccount } from 'next-auth/adapters';

export const extendedAdapter: Adapter = {
	...PrismaAdapter(prisma),
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
		return PrismaAdapter(prisma).linkAccount(
			account,
		) as unknown as AdapterAccount;
	},
	createSession: (data) => {
		return prisma.session.create({ data });
	},
	updateSession: (data) => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { userId, sessionToken, ...rest } = data;
		return prisma.session.update({
			where: { sessionToken: data.sessionToken },
			data: rest,
		});
	},
	deleteSession: async (sessionToken) => {
		await prisma.tenantSession.deleteMany({ where: { sessionToken } });
		return prisma.session.delete({ where: { sessionToken } });
	},
};
