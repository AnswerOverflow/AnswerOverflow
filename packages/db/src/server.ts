import { z } from 'zod';
import {
	getDefaultServerWithFlags,
	prisma,
	Server,
	zServerPrismaCreate,
	zServerPrismaUpdate,
} from '@answeroverflow/prisma-types';
import { upsert } from './utils/operations';
import {
	addFlagsToServer,
	zServer,
	mergeServerFlags,
} from '@answeroverflow/prisma-types';

export const zServerRequired = zServer.pick({
	id: true,
	name: true,
});

export const zServerMutable = zServer
	.omit({
		id: true,
	})
	.deepPartial();

export const zServerCreate = zServerMutable.merge(zServerRequired);

export const zServerUpdate = zServerMutable.merge(
	zServerRequired.pick({
		id: true,
	}),
);

export const zServerUpsert = z.object({
	create: zServerCreate,
	update: zServerMutable.optional(),
});

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

export async function createServer(input: z.infer<typeof zServerCreate>) {
	// Explicitly type this to avoid passing into .parse missing information
	const combinedCreateData = await applyServerSettingsSideEffects({
		old: getDefaultServerWithFlags(input),
		updated: input,
	});
	const created = await prisma.server.create({
		// Strip out any extra data that isn't in the model
		data: zServerPrismaCreate.parse(combinedCreateData),
	});
	return addFlagsToServer(created);
}

export async function findAllServers() {
	const found = await prisma.server.findMany();
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
	const updated = await prisma.server.update({
		where: { id: update.id },
		// Strip out any extra data that isn't in the model
		data: zServerPrismaUpdate.parse(combinedUpdateData),
	});
	return addFlagsToServer(updated);
}

export async function findServerById(id: string) {
	const found = await prisma.server.findUnique({
		where: {
			id,
		},
	});
	if (!found) return null;
	return addFlagsToServer(found);
}

export async function findServerByAlias(alias: string) {
	const found = await prisma.server.findUnique({
		where: {
			vanityUrl: alias,
		},
	});
	if (!found) return null;
	return addFlagsToServer(found);
}

export async function findServerByAliasOrId(aliasOrId: string) {
	const found = await prisma.server.findFirst({
		where: {
			OR: [
				{
					vanityUrl: aliasOrId,
				},
				{
					id: aliasOrId,
				},
			],
		},
	});
	if (!found) return null;
	return addFlagsToServer(found);
}

export async function findManyServersById(ids: string[]) {
	const found = await prisma.server.findMany({ where: { id: { in: ids } } });
	return found.map(addFlagsToServer);
}

export function upsertServer(input: z.infer<typeof zServerUpsert>) {
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
