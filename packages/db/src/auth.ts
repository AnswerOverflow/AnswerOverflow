import { getRandomId } from '@answeroverflow/utils';
import { db } from '../index';
import { accounts, tenantSessions, users, type Account } from './schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

export function findAccountByProviderAccountId(input: {
	provider: string;
	providerAccountId: string;
}) {
	return db
		.select()
		.from(accounts)
		.where(
			and(
				eq(accounts.provider, input.provider),
				eq(accounts.providerAccountId, input.providerAccountId),
			),
		);
}

export function findTenantSessionByToken(token: string) {
	return db.select().from(tenantSessions).where(eq(tenantSessions.id, token));
}

export function deleteTenantSessionByToken(token: string) {
	return db.delete(tenantSessions).where(eq(tenantSessions.id, token));
}

export function findDiscordOauthByProviderAccountId(discordId: string) {
	return findAccountByProviderAccountId({
		provider: 'discord',
		providerAccountId: discordId,
	});
}

export async function findDiscordOauthByUserId(userId: string) {
	const account = await db.query.users.findFirst({
		where: and(eq(users.id, userId), eq(accounts.provider, 'discord')),
	});

	return account ?? null;
}

export async function clearProviderAuthToken(
	input: Pick<Account, 'provider' | 'providerAccountId'>,
) {
	console.log('Token invalid, clearing');

	await db
		.update(accounts)
		.set({
			access_token: null,
			refresh_token: null,
			scope: null,
			expires_at: null,
			token_type: null,
		})
		.where(
			and(
				eq(accounts.provider, input.provider),
				eq(accounts.providerAccountId, input.providerAccountId),
			),
		);
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
		.update(accounts)
		.set(zAccountUpdate.parse(update))
		.where(
			and(
				eq(accounts.provider, provider),
				eq(accounts.providerAccountId, providerAccountId),
			),
		);
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
	return db.insert(accounts).values({
		provider: 'discord',
		type: 'oauth',
		providerAccountId: discordUserId,
		userId: userId,
		access_token: getRandomId(),
	});
}
