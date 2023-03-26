import type { UserServerSettings } from '@prisma/client';
import { omit, pick } from '@answeroverflow/utils';
import { z } from 'zod';
import { bitfieldToDict, mergeFlags, dictToBitfield } from './bitfield';
import { toZObject } from './zod-utils';
import { zDiscordAccountUpsert } from './discord-account-schema';

export const userServerSettingsFlags = [
	'canPubliclyDisplayMessages',
	'messageIndexingDisabled',
] as const;

export const bitfieldToUserServerSettingsFlags = (bitfield: number) =>
	bitfieldToDict(bitfield, userServerSettingsFlags);

export function addFlagsToUserServerSettings<T extends UserServerSettings>(
	userServerSettings: T,
) {
	return {
		...userServerSettings,
		flags: bitfieldToUserServerSettingsFlags(userServerSettings.bitfield),
	};
}

export function userServerSettingsFlagsToBitfield(
	old: number,
	newFlags: Record<string, boolean>,
) {
	return mergeFlags(
		() => bitfieldToUserServerSettingsFlags(old),
		newFlags,
		(flags) => dictToBitfield(flags, userServerSettingsFlags),
	);
}

// ! Prisma breaks if you call it with extra data that isn't in the model, this is used to strip that data out
type UserServerSettingsZodFormat = {
	[K in keyof UserServerSettings]: z.ZodTypeAny;
};
/*
  Internal, used for sanitizing data before sending to Prisma
*/
const internalUserServerSettingsProperties = {
	serverId: z.string(),
	userId: z.string(),
	bitfield: z.number(),
} as const satisfies UserServerSettingsZodFormat;

const internalUserServerSettingsPropertiesMutable = z
	.object(omit(internalUserServerSettingsProperties, 'serverId', 'userId'))
	.partial().shape;

const internalUserServerSettingsPropertiesRequired = pick(
	internalUserServerSettingsProperties,
	'serverId',
	'userId',
);

export const zUserServerSettingsPrismaCreate = z.object({
	...internalUserServerSettingsPropertiesMutable,
	...internalUserServerSettingsPropertiesRequired,
});

export const zUserServerSettingsPrismaUpdate = z.object({
	...internalUserServerSettingsPropertiesMutable,
});

/*
  External, what is used by consumers
*/
export const zUserServerSettingsFlags = toZObject(...userServerSettingsFlags);

const externalUserServerSettingsProperties = {
	...omit(internalUserServerSettingsProperties, 'bitfield'),
	flags: zUserServerSettingsFlags,
};

const externalUserServerSettingsPropertiesRequired = pick(
	externalUserServerSettingsProperties,
	'serverId',
	'userId',
);

const externalUserServerSettingsPropertiesMutable = z
	.object(omit(externalUserServerSettingsProperties, 'serverId', 'userId'))
	.partial().shape;

export const zUserServerSettings = z.object({
	...externalUserServerSettingsPropertiesMutable,
	...externalUserServerSettingsPropertiesRequired,
});

export const zUserServerSettingsRequired = z.object(
	externalUserServerSettingsPropertiesRequired,
);

export const zUserServerSettingsMutable = z
	.object(externalUserServerSettingsPropertiesMutable)
	.deepPartial();

export const zUserServerSettingsFind = z.object(
	pick(externalUserServerSettingsPropertiesRequired, 'serverId', 'userId'),
);

export const zUserServerSettingsCreate = zUserServerSettingsMutable.merge(
	zUserServerSettingsRequired,
);
export const zUserServerSettingsCreateWithDeps = z.object({
	...omit(zUserServerSettingsCreate.shape, 'userId'),
	user: zDiscordAccountUpsert,
});

export type UserServerSettingsCreateWithDeps = z.infer<
	typeof zUserServerSettingsCreateWithDeps
>;

export const zUserServerSettingsUpdate = zUserServerSettingsMutable.merge(
	zUserServerSettingsFind,
);
