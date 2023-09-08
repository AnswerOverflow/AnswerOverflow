import type { z } from 'zod';
import {
	zServerCreate,
	zServerMutable,
	zServerUpdate,
	zServerUpsert,
} from './zod';
import {
	addFlagsToServer,
	mergeServerFlags,
	getDefaultServerWithFlags,
} from './utils/serverUtils';
import { upsert } from './utils/operations';
import { Server, servers } from './schema';
import { db } from './db';
import { eq, inArray, or } from 'drizzle-orm';

export async function applyServerSettingsSideEffects<
	F extends { bitfield: number },
	T extends z.infer<typeof zServerMutable>,
>({ old, updated }: { old: F; updated: T }) {
	const { flags, ...updateDataWithoutFlags } = updated;
	if (updateDataWithoutFlags.vanityUrl) {
		const doesAliasExistAlready = await findServerByAliasOrId(
			updateDataWithoutFlags.vanityUrl,
		);
		if (doesAliasExistAlready) {
			throw new Error(
				`Server with alias ${updateDataWithoutFlags.vanityUrl} already exists`,
			);
		}
	}
	return {
		...updateDataWithoutFlags,
		bitfield: flags ? mergeServerFlags(old.bitfield, flags) : undefined,
	};
}

export async function findServerByCustomDomain(domain: string) {
	const found = await db.query.servers.findFirst({
		where: eq(servers.customDomain, domain),
	});
	if (!found) return null;
	return addFlagsToServer(found);
}

export async function createServer(
	input: z.infer<typeof zServerCreate> & {
		id: string;
		name: string;
	},
) {
	// Explicitly type this to avoid passing into .parse missing information
	const combinedCreateData = await applyServerSettingsSideEffects({
		old: getDefaultServerWithFlags(input),
		updated: input,
	});
	await db.insert(servers).values(zServerCreate.parse(combinedCreateData));
	const created = await db.query.servers.findFirst({
		where: eq(servers.id, input.id),
	});
	if (!created) throw new Error(`Error creating server with id ${input.id}`);
	return addFlagsToServer(created);
}

export async function findAllServers() {
	const found = await db.query.servers.findMany();
	return found.map(addFlagsToServer);
}

export async function updateServer({
	update,
	existing,
}: {
	update: z.infer<typeof zServerUpdate>;
	existing: Server | null;
}) {
	if (!existing) {
		existing = await findServerById(update.id);
		if (!existing) throw new Error(`Server with id ${update.id} not found`);
	}
	// Explicitly type this to avoid passing into .parse missing information
	const combinedUpdateData = await applyServerSettingsSideEffects({
		old: existing,
		updated: update,
	});

	await db
		.update(servers)
		.set(zServerUpdate.parse(combinedUpdateData))
		.where(eq(servers.id, update.id));

	const updated = await db.query.servers.findFirst({
		where: eq(servers.id, update.id),
	});

	if (!updated) throw new Error(`Error updating server with id ${update.id}`);
	return addFlagsToServer(updated);
}

export async function findServerById(id: string) {
	const found = await db.query.servers.findFirst({
		where: eq(servers.id, id),
	});
	if (!found) return null;
	return addFlagsToServer(found);
}

export async function findServerByStripeCustomerId(stripeCustomerId: string) {
	const found = await db.query.servers.findFirst({
		where: eq(servers.stripeCustomerId, stripeCustomerId),
	});
	if (!found) return null;
	return addFlagsToServer(found);
}

export async function findServerByAlias(alias: string) {
	const found = await db.query.servers.findFirst({
		where: eq(servers.vanityUrl, alias),
	});
	if (!found) return null;
	return addFlagsToServer(found);
}

export async function findServerByAliasOrId(aliasOrId: string) {
	const found = await db.query.servers.findFirst({
		where: or(eq(servers.vanityUrl, aliasOrId), eq(servers.id, aliasOrId)),
	});
	if (!found) return null;
	return addFlagsToServer(found);
}

export async function findManyServersById(ids: string[]) {
	if (ids.length === 0) return [];
	const found = await db.query.servers.findMany({
		where: inArray(servers.id, ids),
	});
	return found.map(addFlagsToServer);
}

export function upsertServer(
	input: z.infer<typeof zServerUpsert> & {
		create: z.infer<typeof zServerCreate> & {
			id: string;
			name: string;
		};
	},
) {
	return upsert({
		find: () => findServerById(input.create.id),
		create: () => createServer(input.create),
		update: (old) => {
			if (!input.update) return old;
			return updateServer({
				update: { ...input.update, id: old.id },
				existing: old,
			});
		},
	});
}
