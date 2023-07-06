import { type Account, prisma } from '@answeroverflow/prisma-types';
import { getRandomId } from '@answeroverflow/utils';

export function findAccountByProviderAccountId(input: {
	provider: string;
	providerAccountId: string;
}) {
	return prisma.account.findUnique({
		where: {
			provider_providerAccountId: {
				provider: input.provider,
				providerAccountId: input.providerAccountId,
			},
		},
	});
}

export function findTenantSessionByToken(token: string) {
	return prisma.tenantSession.findUnique({
		where: {
			id: token,
		},
	});
}

export function deleteTenantSessionByToken(token: string) {
	return prisma.tenantSession.delete({
		where: {
			id: token,
		},
	});
}

export function findDiscordOauthByProviderAccountId(discordId: string) {
	return findAccountByProviderAccountId({
		provider: 'discord',
		providerAccountId: discordId,
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

export async function clearProviderAuthToken(
	input: Pick<Account, 'provider' | 'providerAccountId'>,
) {
	await prisma.account.update({
		where: {
			provider_providerAccountId: {
				provider: input.provider,
				providerAccountId: input.providerAccountId,
			},
		},
		data: {
			access_token: null,
			refresh_token: null,
			scope: null,
			expires_at: null,
			token_type: null,
		},
	});
}

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
	await prisma.account.update({
		where: {
			provider_providerAccountId: {
				provider: provider,
				providerAccountId: providerAccountId,
			},
		},
		data: update,
	});
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
