import { prisma } from '@answeroverflow/prisma-types';
import { getRandomId } from '@answeroverflow/utils';

export function findDiscordOauthByProviderAccountId(discordId: string) {
	return prisma.account.findUnique({
		where: {
			provider_providerAccountId: {
				provider: 'discord',
				providerAccountId: discordId,
			},
		},
	});
}

export async function findDiscordOauthByUserId(userId: string) {
	const account = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		select: {
			accounts: {
				where: {
					provider: 'discord',
				},
			},
		},
	});
	return account?.accounts[0] ?? null;
}

// todo: move to its own package
//! MAINLY TEST ONLY
export function _NOT_PROD_createOauthAccountEntry({
	discordUserId,
	userId,
}: {
	discordUserId: string;
	userId: string;
}) {
	return prisma.account.create({
		data: {
			provider: 'discord',
			type: 'oauth',
			providerAccountId: discordUserId,
			userId: userId,
			access_token: getRandomId(),
		},
	});
}
