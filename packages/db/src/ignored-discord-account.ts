import { findDiscordAccountById } from './discord-account';
import { DBError } from './utils/error';
import { db } from './db';
import { ignoredDiscordAccounts } from './schema';
import { eq, inArray } from 'drizzle-orm';

export function findIgnoredDiscordAccountById(id: string) {
	return db.query.ignoredDiscordAccounts.findFirst({
		where: eq(ignoredDiscordAccounts.id, id),
	});
}

export function findManyIgnoredDiscordAccountsById(ids: string[]) {
	return db.query.ignoredDiscordAccounts.findMany({
		where: inArray(ignoredDiscordAccounts.id, ids),
	});
}

export async function upsertIgnoredDiscordAccount(id: string) {
	const discordAccount = await findDiscordAccountById(id);
	if (discordAccount)
		throw new DBError('Account is not ignored', 'NOT_IGNORED_ACCOUNT');
	await db.insert(ignoredDiscordAccounts).values({ id }).onDuplicateKeyUpdate({
		set: {
			id,
		},
	});
	const upserted = await db.query.ignoredDiscordAccounts.findFirst({
		where: eq(ignoredDiscordAccounts.id, id),
	});

	if (!upserted) throw new Error('Failed to upsert account');
	return upserted;
}

export async function deleteIgnoredDiscordAccount(id: string) {
	await db
		.delete(ignoredDiscordAccounts)
		.where(eq(ignoredDiscordAccounts.id, id));

	const deleted = await db.query.ignoredDiscordAccounts.findFirst({
		where: eq(ignoredDiscordAccounts.id, id),
	});

	if (deleted) throw new Error('Failed to delete account');

	return {
		id,
	};
}
