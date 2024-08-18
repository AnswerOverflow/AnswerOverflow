import { z } from 'zod';
import { upsertDiscordAccount } from './discord-account';
import {
	addFlagsToUserServerSettings,
	userServerSettingsFlags,
	UserServerSettingsWithFlags,
} from './utils/userServerSettingsUtils';
import { upsert } from './utils/operations';
import { DBError } from './utils/error';
import { db, dbReplica } from './db';
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import {
	dbMessages,
	dbUserServerSettings,
	userServerSettingsSchema,
} from './schema';
import {
	zUserServerSettingsCreate,
	zUserServerSettingsCreateWithDeps,
	zUserServerSettingsMutable,
	zUserServerSettingsUpdate,
} from './zodSchemas/userServerSettingsSchemas';
import { getDefaultUserServerSettingsWithFlags } from './utils/serverUtils';
import { dictToBitfield } from './utils/bitfieldUtils';

export const CANNOT_GRANT_CONSENT_TO_PUBLICLY_DISPLAY_MESSAGES_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE =
	'You cannot grant consent to publicly display messages with message indexing disabled. Enable messaging indexing first';

// Applies all side effects of updating user server settings
// Does not update the user server settings in the database, only handles side effects
export async function applyUserServerSettingsChangesSideEffects<
	T extends z.infer<typeof zUserServerSettingsMutable>,
>(old: UserServerSettingsWithFlags, updated: T) {
	const oldFlags = old.flags
		? addFlagsToUserServerSettings(old).flags
		: getDefaultUserServerSettingsWithFlags({
				userId: old.userId,
				serverId: old.serverId,
			}).flags;

	// Flags to update is what is being passed in from the update data
	const flagsToUpdate = updated?.flags ? updated.flags : {};

	// Pending settings is the merged old and settings that need to be updated
	const pendingSettings: UserServerSettingsWithFlags = {
		...old,
		...updated,
		flags: {
			...oldFlags,
			...flagsToUpdate,
		},
	};

	// The user is trying to grant consent to publicly display messages with message indexing disabled
	if (
		flagsToUpdate?.canPubliclyDisplayMessages &&
		pendingSettings.flags?.messageIndexingDisabled
	) {
		throw new DBError(
			CANNOT_GRANT_CONSENT_TO_PUBLICLY_DISPLAY_MESSAGES_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE,
			'INVALID_CONFIGURATION',
		);
	}

	// User has disabled message indexing, so we need to remove the consent to publicly display messages
	if (
		flagsToUpdate.messageIndexingDisabled &&
		pendingSettings.flags?.canPubliclyDisplayMessages
	) {
		pendingSettings.flags.canPubliclyDisplayMessages = false;
	}

	// If we have now disabled message indexing, delete all messages from the user in the server
	if (
		pendingSettings?.flags.messageIndexingDisabled &&
		!oldFlags.messageIndexingDisabled
	) {
		await db
			.delete(dbMessages)
			.where(
				and(
					eq(dbMessages.serverId, pendingSettings.serverId),
					eq(dbMessages.authorId, pendingSettings.userId),
				),
			);
	}
	const bitfield = dictToBitfield(
		pendingSettings.flags,
		userServerSettingsFlags,
	);
	return {
		...pendingSettings,
		bitfield,
	};
}

interface UserServerSettingsFindById {
	userId: string;
	serverId: string;
}

export async function findUserServerSettingsById(
	where: UserServerSettingsFindById,
) {
	const data = await db.query.dbUserServerSettings.findFirst({
		where: and(
			eq(dbUserServerSettings.userId, where.userId),
			eq(dbUserServerSettings.serverId, where.serverId),
		),
	});

	return data ? addFlagsToUserServerSettings(data) : null;
}

export async function countConsentingUsersInServer(serverId: string) {
	const res = await db
		.select({
			count: sql<number>`count(*)`,
		})
		.from(dbUserServerSettings)
		.where(
			and(eq(dbUserServerSettings.serverId, serverId), sql`bitfield & 1 = 1`),
		)
		.then((x) => x[0]);
	if (!res) {
		throw new Error('No count returned');
	}
	return BigInt(res.count);
}

export async function countConsentingUsersInManyServers(serverIds: string[]) {
	if (serverIds.length === 0) return new Map();
	const res = await db
		.select({
			count: sql<number>`count(*)`,
			serverId: dbUserServerSettings.serverId,
		})
		.from(dbUserServerSettings)
		.where(
			and(
				inArray(dbUserServerSettings.serverId, Array.from(new Set(serverIds))),
				sql`bitfield & 1 = 1`,
			),
		)
		.groupBy(dbUserServerSettings.serverId);
	const asMap = new Map(res.map((x) => [x.serverId, x.count]));
	return new Map(
		serverIds.map((x) => {
			const count = asMap.get(x);
			return [x, count ? BigInt(count) : BigInt(0)];
		}),
	);
}

export async function findManyUserServerSettings(
	where: UserServerSettingsFindById[],
) {
	if (where.length === 0) return [];
	const data = await dbReplica.query.dbUserServerSettings.findMany({
		where: and(
			inArray(
				dbUserServerSettings.userId,
				where.map((x) => x.userId),
			),
			inArray(
				dbUserServerSettings.serverId,
				where.map((x) => x.serverId),
			),
			isNotNull(dbUserServerSettings.bitfield),
		),
	});
	return data.map(addFlagsToUserServerSettings);
}

export async function createUserServerSettings(
	data: z.infer<typeof zUserServerSettingsCreate>,
) {
	const updateData = await applyUserServerSettingsChangesSideEffects(
		getDefaultUserServerSettingsWithFlags({
			...data,
		}),
		data,
	);
	await db
		.insert(dbUserServerSettings)
		.values(userServerSettingsSchema.parse(updateData));
	const created = (await db.query.dbUserServerSettings.findFirst({
		where: and(
			eq(dbUserServerSettings.userId, data.userId),
			isNotNull(dbUserServerSettings.bitfield),
		),
	})) as UserServerSettingsWithFlags | null;
	if (!created) throw new Error('Error creating user server settings');
	return addFlagsToUserServerSettings(created);
}

export async function updateUserServerSettings(
	data: z.infer<typeof zUserServerSettingsUpdate>,
	existing: UserServerSettingsWithFlags | null,
) {
	if (!existing) {
		existing = await findUserServerSettingsById({
			userId: data.userId,
			serverId: data.serverId,
		});
	}
	if (!existing) {
		throw new Error('UserServerSettings not found');
	}
	const updateData = await applyUserServerSettingsChangesSideEffects(
		existing,
		data,
	);

	await db
		.update(dbUserServerSettings)
		.set(userServerSettingsSchema.parse(updateData))
		.where(
			and(
				eq(dbUserServerSettings.userId, data.userId),
				eq(dbUserServerSettings.serverId, data.serverId),
			),
		);
	const updated = await findUserServerSettingsById({
		userId: data.userId,
		serverId: data.serverId,
	});

	if (!updated) throw new Error('Error updating user server settings');
	return addFlagsToUserServerSettings(updated);
}

export async function upsertUserServerSettingsWithDeps(
	data: z.infer<typeof zUserServerSettingsCreateWithDeps>,
) {
	return upsert({
		find: () =>
			findUserServerSettingsById({
				userId: data.user.id,
				serverId: data.serverId,
			}),
		create: async () => {
			await upsertDiscordAccount(data.user);
			return createUserServerSettings({
				serverId: data.serverId,
				userId: data.user.id,
				flags: data.flags,
				apiKey: data.apiKey,
			});
		},
		update: async (existing) => {
			return updateUserServerSettings(
				{
					serverId: data.serverId,
					userId: data.user.id,
					flags: data.flags,
					apiKey: data.apiKey,
				},
				existing,
			);
		},
	});
}

export async function findUserServerSettingsByApiKey(apiKey: string) {
	const data = await db.query.dbUserServerSettings.findFirst({
		where: eq(dbUserServerSettings.apiKey, apiKey),
	});
	return data ? addFlagsToUserServerSettings(data) : undefined;
}

export async function increaseApiKeyUsage(apiKey: string) {
	await db.execute(
		sql`UPDATE ${dbUserServerSettings} SET ${dbUserServerSettings.apiCallsUsed} = ${dbUserServerSettings.apiCallsUsed} + 1 WHERE ${dbUserServerSettings.apiKey} = ${apiKey}`,
	);
}
