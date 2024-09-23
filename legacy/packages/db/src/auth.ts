import { getRandomId } from '@answeroverflow/utils';
import { db } from './db';
import { dbAccounts, dbTenantSessions, dbUsers, type Account } from './schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

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
