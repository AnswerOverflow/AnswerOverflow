import type { z } from 'zod';
import {
	addFlagsToUserServerSettings,
	type DiscordAccount,
	getDefaultDiscordAccount,
	prisma,
	zDiscordAccountCreate,
	zDiscordAccountPrismaCreate,
	zDiscordAccountPrismaUpdate,
	zDiscordAccountUpdate,
	zDiscordAccountUpsert,
} from '@answeroverflow/prisma-types';
import {
	upsertIgnoredDiscordAccount,
	findIgnoredDiscordAccountById,
	findManyIgnoredDiscordAccountsById,
} from './ignored-discord-account';
import { DBError } from './utils/error';
import { upsert, upsertMany } from './utils/operations';
import { deleteManyMessagesByUserId } from './message';

export function findDiscordAccountById(id: string) {
	return prisma.discordAccount.findUnique({
		where: { id },
	});
}

export function findManyDiscordAccountsById(ids: string[]) {
	return prisma.discordAccount.findMany({
		where: { id: { in: ids } },
	});
}

export async function createDiscordAccount(
	data: z.infer<typeof zDiscordAccountCreate>,
) {
	const deletedAccount = await findIgnoredDiscordAccountById(data.id);
	if (deletedAccount)
		throw new DBError('Account is ignored', 'IGNORED_ACCOUNT');
	return prisma.discordAccount.create({
		data: zDiscordAccountPrismaCreate.parse(data),
	});
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

	const createOps: Promise<unknown>[] = [];
	for (let i = 0; i < allowedToCreateAccounts.length; i += 50) {
		const chunk = allowedToCreateAccounts.slice(i, i + 50);
		createOps.push(
			prisma.discordAccount.createMany({
				data: chunk.map((i) => zDiscordAccountPrismaCreate.parse(i)),
			}),
		);
	}
	await Promise.all(createOps);
	return allowedToCreateAccounts.map((i) => getDefaultDiscordAccount(i));
}

export async function updateDiscordAccount(
	data: z.infer<typeof zDiscordAccountUpdate>,
) {
	return prisma.discordAccount.update({
		where: { id: data.id },
		data: zDiscordAccountPrismaUpdate.parse(data),
	});
}
export async function updateManyDiscordAccounts(
	data: z.infer<typeof zDiscordAccountUpdate>[],
) {
	const uniqueAccountsToCreate = new Map<
		string,
		z.infer<typeof zDiscordAccountUpdate>
	>(data.map((i) => [i.id, i]));
	const accountSet = Array.from(uniqueAccountsToCreate.values());

	const operations: Promise<DiscordAccount[]>[] = [];
	for (let i = 0; i < accountSet.length; i += 50) {
		const chunk = accountSet.slice(i, i + 50);
		operations.push(
			prisma.$transaction(
				chunk.map((account) =>
					prisma.discordAccount.update({
						where: { id: account.id },
						data: zDiscordAccountPrismaUpdate.parse(account),
					}),
				),
			),
		);
	}
	const results = await Promise.all(operations);
	return results.flat();
}

export async function deleteDiscordAccount(id: string) {
	const existingAccount = await findDiscordAccountById(id);
	if (existingAccount) await prisma.discordAccount.delete({ where: { id } });
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

export async function findDiscordAccountWithUserServerSettings({
	authorId,
	authorServerId,
}: {
	authorId: string;
	authorServerId: string[];
}) {
	const data = await prisma.discordAccount.findUnique({
		where: {
			id: authorId,
		},
		include: {
			userServerSettings: {
				where: {
					serverId: {
						in: authorServerId,
					},
				},
			},
		},
	});
	if (!data) return null;
	const userServerSettingsWithFlags = data.userServerSettings.map((i) =>
		addFlagsToUserServerSettings(i),
	);
	return {
		...data,
		userServerSettings: userServerSettingsWithFlags,
	};
}

export async function findManyDiscordAccountsWithUserServerSettings({
	authorIds,
	authorServerIds,
}: {
	authorIds: string[];
	authorServerIds: string[];
}) {
	const data = await prisma.discordAccount.findMany({
		where: {
			id: {
				in: authorIds,
			},
		},
		include: {
			userServerSettings: {
				where: {
					serverId: {
						in: authorServerIds,
					},
				},
			},
		},
	});
	return data.map((i) => ({
		...i,
		userServerSettings: i.userServerSettings.map((j) =>
			addFlagsToUserServerSettings(j),
		),
	}));
}
