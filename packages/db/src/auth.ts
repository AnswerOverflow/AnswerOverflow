import { getRandomId } from '@answeroverflow/utils';
import { db } from './db';
import { accounts, tenantSessions, users, type Account } from './schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import * as crypto from 'crypto';

export async function findAccountByProviderAccountId(input: {
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
		)
		.then((x) => x.at(0));
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
	const account = await db.query.accounts.findFirst({
		where: and(eq(users.id, userId), eq(accounts.provider, 'discord')),
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
export async function _NOT_PROD_createOauthAccountEntry({
	discordUserId,
	userId,
}: {
	discordUserId: string;
	userId: string;
}) {
	await db.insert(accounts).values({
		id: getRandomId(), // TODO: Is this okay?
		provider: 'discord',
		type: 'oauth',
		providerAccountId: discordUserId,
		userId: userId,
		access_token: getRandomId(),
	});

	const inserted = await db.query.accounts.findFirst({
		where: and(
			eq(accounts.provider, 'discord'),
			eq(accounts.providerAccountId, discordUserId),
		),
	});

	if (!inserted) throw new Error('Failed to insert account');

	return inserted;
}

export async function createUser(id?: string) {
	const userId = id ?? crypto.randomUUID();
	await db.insert(users).values({
		id: userId,
	});
	return db.query.users.findFirst({
		where: eq(users.id, userId),
	});
}
