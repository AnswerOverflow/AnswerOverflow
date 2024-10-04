import { eq, inArray } from 'drizzle-orm';
import { db } from './db';
import { findDiscordAccountById } from './discord-account';
import { dbIgnoredDiscordAccounts } from './schema';
import { DBError } from './utils/error';

export function findIgnoredDiscordAccountById(id: string) {
	return db.query.dbIgnoredDiscordAccounts.findFirst({
		where: eq(dbIgnoredDiscordAccounts.id, id),
	});
}

export function findManyIgnoredDiscordAccountsById(ids: string[]) {
	if (ids.length === 0) return Promise.resolve([]);
	return db.query.dbIgnoredDiscordAccounts.findMany({
		where: inArray(dbIgnoredDiscordAccounts.id, ids),
	});
}

export async function upsertIgnoredDiscordAccount(id: string) {
	const discordAccount = await findDiscordAccountById(id);
	if (discordAccount)
		throw new DBError('Account is not ignored', 'NOT_IGNORED_ACCOUNT');
	await db
		.insert(dbIgnoredDiscordAccounts)
		.values({ id })
		.onDuplicateKeyUpdate({
			set: {
				id,
			},
		});
	const upserted = await db.query.dbIgnoredDiscordAccounts.findFirst({
		where: eq(dbIgnoredDiscordAccounts.id, id),
	});

	if (!upserted) throw new Error('Failed to upsert account');
	return upserted;
}

export async function deleteIgnoredDiscordAccount(id: string) {
	await db
		.delete(dbIgnoredDiscordAccounts)
		.where(eq(dbIgnoredDiscordAccounts.id, id));

	const deleted = await db.query.dbIgnoredDiscordAccounts.findFirst({
		where: eq(dbIgnoredDiscordAccounts.id, id),
	});

	if (deleted) throw new Error('Failed to delete account');

	return {
		id,
	};
}
