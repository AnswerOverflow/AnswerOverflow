import type { z } from "zod";
import {
	prisma,
	getDefaultUserServerSettings,
	UserServerSettings,
	zUserServerSettings,
	getDefaultUserServerSettingsWithFlags,
	dictToBitfield,
	UserServerSettingsWithFlags,
	userServerSettingsFlags
} from "@answeroverflow/prisma-types";
import { upsertDiscordAccount, zDiscordAccountUpsert } from "./discord-account";
import {
	addFlagsToUserServerSettings,
	zUserServerSettingsWithFlags
} from "@answeroverflow/prisma-types";
import { upsert } from "./utils/operations";
import { DBError } from "./utils/error";
import { omit } from "@answeroverflow/utils";

export const zUserServerSettingsRequired = zUserServerSettingsWithFlags.pick({
	userId: true,
	serverId: true
});

export const zUserServerSettingsMutable = zUserServerSettingsWithFlags
	.omit({
		userId: true,
		serverId: true
	})
	.deepPartial();

export const zUserServerSettingsFind = zUserServerSettingsRequired;

export const zUserServerSettingsCreate = zUserServerSettingsMutable.merge(
	zUserServerSettingsRequired
);
export const zUserServerSettingsCreateWithDeps = zUserServerSettingsCreate
	.omit({
		userId: true // we infer this from the user
	})
	.extend({
		user: zDiscordAccountUpsert
	});

export type UserServerSettingsCreateWithDeps = z.infer<typeof zUserServerSettingsCreateWithDeps>;

export const zUserServerSettingsUpdate = zUserServerSettingsMutable.merge(zUserServerSettingsFind);

export const CANNOT_GRANT_CONSENT_TO_PUBLICLY_DISPLAY_MESSAGES_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE =
	"You cannot grant consent to publicly display messages with message indexing disabled. Enable messaging indexing first";

// Applies all side effects of updating user server settings
// Does not update the user server settings in the database, only handles side effects
export async function applyUserServerSettingsChangesSideEffects<
	T extends z.infer<typeof zUserServerSettingsMutable>
>(old: UserServerSettings, updated: T) {
	const oldFlags = old.bitfield
		? addFlagsToUserServerSettings(old).flags
		: getDefaultUserServerSettingsWithFlags({
				userId: old.userId,
				serverId: old.serverId
		  }).flags;

	// Flags to update is what is being passed in from the update data
	const flagsToUpdate = updated?.flags ? updated.flags : {};

	// Pending settings is the merged old and settings that need to be updated
	const pendingSettings: UserServerSettingsWithFlags = {
		...old,
		...updated,
		flags: {
			...oldFlags,
			...flagsToUpdate
		}
	};

	// The user is trying to grant consent to publicly display messages with message indexing disabled
	if (
		flagsToUpdate?.canPubliclyDisplayMessages &&
		pendingSettings.flags?.messageIndexingDisabled
	) {
		throw new DBError(
			CANNOT_GRANT_CONSENT_TO_PUBLICLY_DISPLAY_MESSAGES_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE,
			"INVALID_CONFIGURATION"
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
	if (pendingSettings?.flags.messageIndexingDisabled && !oldFlags.messageIndexingDisabled) {
		await elastic?.deleteByUserIdInServer({
			userId: old.userId,
			serverId: old.serverId
		});
	}
	const bitfield = dictToBitfield(pendingSettings.flags, userServerSettingsFlags);
	return zUserServerSettings.parse({
		...omit(pendingSettings, "flags"),
		bitfield
	});
}

interface UserServerSettingsFindById {
	userId: string;
	serverId: string;
}

export async function findUserServerSettingsById(where: UserServerSettingsFindById) {
	const data = await prisma.userServerSettings.findUnique({
		where: {
			userId_serverId: {
				userId: where.userId,
				serverId: where.serverId
			}
		}
	});
	return data ? addFlagsToUserServerSettings(data) : null;
}

export async function findManyUserServerSettings(where: UserServerSettingsFindById[]) {
	// TODO: Maybe just make it only selecting for 1 server at a time
	const data = await prisma.userServerSettings.findMany({
		where: {
			AND: {
				userId: {
					in: where.map((x) => x.userId)
				},
				serverId: {
					in: where.map((x) => x.serverId)
				}
			}
		}
	});
	return data.map(addFlagsToUserServerSettings);
}

export async function createUserServerSettings(data: z.infer<typeof zUserServerSettingsCreate>) {
	const updateData = await applyUserServerSettingsChangesSideEffects(
		getDefaultUserServerSettings({
			...data
		}),
		data
	);
	const created = await prisma.userServerSettings.create({
		data: updateData
	});
	return addFlagsToUserServerSettings(created);
}

export async function updateUserServerSettings(
	data: z.infer<typeof zUserServerSettingsUpdate>,
	existing: UserServerSettings | null
) {
	if (!existing) {
		existing = await findUserServerSettingsById({
			userId: data.userId,
			serverId: data.serverId
		});
	}
	if (!existing) {
		throw new Error("UserServerSettings not found");
	}
	const updateData = await applyUserServerSettingsChangesSideEffects(existing, data);
	const updated = await prisma.userServerSettings.update({
		where: {
			userId_serverId: {
				userId: data.userId,
				serverId: data.serverId
			}
		},
		data: updateData
	});
	return addFlagsToUserServerSettings(updated);
}

export async function upsertUserServerSettingsWithDeps(
	data: z.infer<typeof zUserServerSettingsCreateWithDeps>
) {
	return upsert({
		find: () =>
			findUserServerSettingsById({
				userId: data.user.id,
				serverId: data.serverId
			}),
		create: async () => {
			await upsertDiscordAccount(data.user);
			return createUserServerSettings({
				serverId: data.serverId,
				userId: data.user.id,
				flags: data.flags
			});
		},
		update: async (existing) => {
			return updateUserServerSettings(
				{
					serverId: data.serverId,
					userId: data.user.id,
					flags: data.flags
				},
				existing
			);
		}
	});
}
