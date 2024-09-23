import { z } from 'zod';
import {
	upsertIgnoredDiscordAccount,
	findIgnoredDiscordAccountById,
	findManyIgnoredDiscordAccountsById,
} from './ignored-discord-account';
import { DBError } from './utils/error';
import { upsert, upsertMany } from './utils/operations';
import { deleteManyMessagesByUserId } from './message';
import { db } from './db';
import { eq, inArray } from 'drizzle-orm';
import { dbDiscordAccounts, discordAccountSchema } from './schema';
import {
	zDiscordAccountCreate,
	zDiscordAccountUpdate,
	zDiscordAccountUpsert,
} from './zodSchemas/discordAccountSchemas';
import { getDefaultDiscordAccount } from './utils/discordAccountUtils';

export async function findDiscordAccountById(id: string) {
	return db.query.dbDiscordAccounts.findFirst({
		where: eq(dbDiscordAccounts.id, id),
	});
}

export function findManyDiscordAccountsById(ids: string[]) {
	if (ids.length === 0) return Promise.resolve([]);
	return db.query.dbDiscordAccounts.findMany({
		where: inArray(dbDiscordAccounts.id, ids),
	});
}

export async function createDiscordAccount(
	data: z.infer<typeof zDiscordAccountCreate>,
) {
	const deletedAccount = await findIgnoredDiscordAccountById(data.id);
	if (deletedAccount)
		throw new DBError('Account is ignored', 'IGNORED_ACCOUNT');
	await db.insert(dbDiscordAccounts).values(discordAccountSchema.parse(data));
	const createdAccount = await findDiscordAccountById(data.id);
	if (!createdAccount) throw new Error('Failed to create account');
	return createdAccount;
}

export async function createManyDiscordAccounts(
	data: z.infer<typeof zDiscordAccountCreate>[],
) {
	const ignoredAccounts = await findManyIgnoredDiscordAccountsById(
		data.map((i) => i.id),
	);
	const ignoredIdsLookup = new Set(ignoredAccounts.map((i) => i.id));
	const allowedToCreateAccounts = data.filter(
		(x) => !ignoredIdsLookup.has(x.id),
	);
	const chunkSize = 25;
	const chunks = [];
	for (let i = 0; i < allowedToCreateAccounts.length; i += chunkSize) {
		chunks.push(allowedToCreateAccounts.slice(i, i + chunkSize));
	}
	for await (const chunk of chunks) {
		await Promise.all(
			chunk.map(async (account) =>
				db
					.insert(dbDiscordAccounts)
					.values(discordAccountSchema.parse(account)),
			),
		);
	}
	return allowedToCreateAccounts.map((i) => getDefaultDiscordAccount(i));
}

export async function updateDiscordAccount(
	data: z.infer<typeof zDiscordAccountUpdate>,
) {
	await db
		.update(dbDiscordAccounts)
		.set(discordAccountSchema.parse(data))
		.where(eq(dbDiscordAccounts.id, data.id));

	const updatedDiscordAccount = await db.query.dbDiscordAccounts.findFirst({
		where: eq(dbDiscordAccounts.id, data.id),
	});

	if (!updatedDiscordAccount) throw new Error('Failed to update account');
	return updatedDiscordAccount;
}
export async function updateManyDiscordAccounts(
	data: z.infer<typeof zDiscordAccountUpdate>[],
) {
	const uniqueAccountsToCreate = new Map<
		string,
		z.infer<typeof zDiscordAccountUpdate>
	>(data.map((i) => [i.id, i]));
	const accountSet = Array.from(uniqueAccountsToCreate.values());

	const chunkSize = 25;
	const chunks = [];
	for (let i = 0; i < accountSet.length; i += chunkSize) {
		chunks.push(accountSet.slice(i, i + chunkSize));
	}
	for await (const chunk of chunks) {
		await Promise.all(
			chunk.map(async (account) =>
				db
					.update(dbDiscordAccounts)
					.set(discordAccountSchema.parse(account))
					.where(eq(dbDiscordAccounts.id, account.id)),
			),
		);
	}
	return findManyDiscordAccountsById(accountSet.map((i) => i.id));
}

export async function deleteDiscordAccount(id: string) {
	const existingAccount = await findDiscordAccountById(id);
	if (existingAccount)
		await db.delete(dbDiscordAccounts).where(eq(dbDiscordAccounts.id, id));
	await Promise.all([
		upsertIgnoredDiscordAccount(id),
		deleteManyMessagesByUserId(id),
	]);

	return true;
}

export async function upsertDiscordAccount(
	data: z.infer<typeof zDiscordAccountUpsert>,
) {
	return upsert({
		find: () => findDiscordAccountById(data.id),
		create: () => createDiscordAccount(data),
		update: () => updateDiscordAccount(data),
	});
}

export async function upsertManyDiscordAccounts(
	data: z.infer<typeof zDiscordAccountUpsert>[],
) {
	return upsertMany({
		find: () => findManyDiscordAccountsById(data.map((i) => i.id)),
		create: (createInput) => createManyDiscordAccounts(createInput),
		update: (updateInput) => updateManyDiscordAccounts(updateInput),
		getFetchedDataId: (i) => i.id,
		getInputId: (i) => i.id,
		input: data,
	});
}
