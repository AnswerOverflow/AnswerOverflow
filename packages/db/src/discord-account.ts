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
import { discordAccounts, userServerSettings } from './schema';
import { addFlagsToUserServerSettings } from './utils/userServerSettingsUtils';
import {
	zDiscordAccountCreate,
	zDiscordAccountUpdate,
	zDiscordAccountUpsert,
} from './zodSchemas/discordAccountSchemas';
import { getDefaultDiscordAccount } from './utils/discordAccountUtils';
import { createInsertSchema } from 'drizzle-zod';

const zUserServerSettingsFlags = z.object({
	userId: z.string(),
	serverId: z.string(),
	bitfield: z.number(),
});

export async function findDiscordAccountById(id: string) {
	return db.query.discordAccounts.findFirst({
		where: eq(discordAccounts.id, id),
	});
}

export function findManyDiscordAccountsById(ids: string[]) {
	if (ids.length === 0) return Promise.resolve([]);
	return db.query.discordAccounts.findMany({
		where: inArray(discordAccounts.id, ids),
	});
}

export async function createDiscordAccount(
	data: z.infer<typeof zDiscordAccountCreate>,
) {
	const deletedAccount = await findIgnoredDiscordAccountById(data.id);
	if (deletedAccount)
		throw new DBError('Account is ignored', 'IGNORED_ACCOUNT');
	await db
		.insert(discordAccounts)
		.values(createInsertSchema(discordAccounts).parse(data));
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

	await Promise.all(
		allowedToCreateAccounts.map(async (account) => {
			await db
				.insert(discordAccounts)
				.values(createInsertSchema(discordAccounts).parse(account));
		}),
	);
	return allowedToCreateAccounts.map((i) => getDefaultDiscordAccount(i));
}

export async function updateDiscordAccount(
	data: z.infer<typeof zDiscordAccountUpdate>,
) {
	await db
		.update(discordAccounts)
		.set(createInsertSchema(discordAccounts).parse(data))
		.where(eq(discordAccounts.id, data.id));

	const updatedDiscordAccount = await db.query.discordAccounts.findFirst({
		where: eq(discordAccounts.id, data.id),
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

	const updatedDiscordAccounts = await Promise.all(
		accountSet.map(async (account) => {
			await db
				.update(discordAccounts)
				.set(createInsertSchema(discordAccounts).parse(account))
				.where(eq(discordAccounts.id, account.id));

			return db.query.discordAccounts.findFirst({
				where: eq(discordAccounts.id, account.id),
			});
		}),
	);

	return updatedDiscordAccounts.flat();
}

export async function deleteDiscordAccount(id: string) {
	const existingAccount = await findDiscordAccountById(id);
	if (existingAccount)
		await db.delete(discordAccounts).where(eq(discordAccounts.id, id));
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

export async function findManyDiscordAccountsWithUserServerSettings({
	authorIds,
	authorServerIds,
}: {
	authorIds: string[];
	authorServerIds: string[];
}) {
	if (authorIds.length === 0 || authorServerIds.length === 0)
		return Promise.resolve([]);
	const data = await db.query.discordAccounts.findMany({
		where: inArray(discordAccounts.id, authorIds),
		with: {
			userServerSettings: {
				where: inArray(userServerSettings.serverId, authorServerIds),
			},
		},
	});
	return data.map((i) => ({
		...i,
		userServerSettings: i.userServerSettings.map((j) => {
			return addFlagsToUserServerSettings(zUserServerSettingsFlags.parse(j));
		}),
	}));
}
