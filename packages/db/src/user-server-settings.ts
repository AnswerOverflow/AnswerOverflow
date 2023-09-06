import { z } from 'zod';
import { upsertDiscordAccount } from './discord-account';
import {
	addFlagsToUserServerSettings,
	userServerSettingsFlags,
	UserServerSettingsWithFlags,
} from './utils/userServerSettingsUtils';
import { upsert } from './utils/operations';
import { DBError } from './utils/error';
import { db } from './db';
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { userServerSettings } from './schema';
import {
	zUserServerSettingsCreate,
	zUserServerSettingsCreateWithDeps,
	zUserServerSettingsMutable,
	zUserServerSettingsPrismaCreate,
	zUserServerSettingsPrismaUpdate,
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
		await elastic?.deleteByUserIdInServer({
			userId: old.userId,
			serverId: old.serverId,
		});
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
	const data = (await db.query.userServerSettings.findFirst({
		where: and(
			eq(userServerSettings.userId, where.userId),
			eq(userServerSettings.serverId, where.serverId),
			isNotNull(userServerSettings.bitfield),
		),
	})) as UserServerSettingsWithFlags | null;

	return data ? addFlagsToUserServerSettings(data) : null;
}

export async function countConsentingUsersInServer(serverId: string) {
	const res = await db.execute(sql`SELECT COUNT(*) as count
    FROM UserServerSettings
    WHERE serverId = ${serverId} AND bitfield & 1 = 1;`);
	const parsed = z
		.array(
			z.object({
				count: z.bigint(),
			}),
		)
		.parse(res);
	const first = parsed[0];
	if (!first) {
		throw new Error('No count returned');
	}
	return first.count;
}

export async function countConsentingUsersInManyServers(serverIds: string[]) {
	if (serverIds.length === 0) return new Map();
	const res = await db
		.select({
			count: sql<number>`count(*)`,
			serverId: userServerSettings.serverId,
		})
		.from(userServerSettings)
		.where(
			and(
				inArray(userServerSettings.serverId, Array.from(new Set(serverIds))),
				sql`bitfield & 1 = 1`,
			),
		)
		.groupBy(userServerSettings.serverId);
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
	const data = (await db.query.userServerSettings.findMany({
		where: and(
			inArray(
				userServerSettings.userId,
				where.map((x) => x.userId),
			),
			inArray(
				userServerSettings.serverId,
				where.map((x) => x.serverId),
			),
			isNotNull(userServerSettings.bitfield),
		),
	})) as UserServerSettingsWithFlags[];
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
		.insert(userServerSettings)
		.values(zUserServerSettingsPrismaCreate.parse(updateData));
	const created = (await db.query.userServerSettings.findFirst({
		where: and(
			eq(userServerSettings.userId, data.userId),
			isNotNull(userServerSettings.bitfield),
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
		.update(userServerSettings)
		.set(zUserServerSettingsPrismaUpdate.parse(updateData))
		.where(
			and(
				eq(userServerSettings.userId, data.userId),
				eq(userServerSettings.serverId, data.serverId),
			),
		);
	const updated = (await db.query.userServerSettings.findFirst({
		where: and(
			eq(userServerSettings.userId, data.userId),
			eq(userServerSettings.serverId, data.serverId),
		),
	})) as UserServerSettingsWithFlags | null;
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
			});
		},
		update: async (existing) => {
			return updateUserServerSettings(
				{
					serverId: data.serverId,
					userId: data.user.id,
					flags: data.flags,
				},
				existing,
			);
		},
	});
}
