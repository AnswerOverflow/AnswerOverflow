// ! Prisma breaks if you call it with extra data that isn't in the model, this is used to strip that data out
import { zDiscordAccountUpsert } from './discordAccountSchemas';
import { omit, pick } from '@answeroverflow/utils';
import { z } from 'zod';

/*
  Internal, used for sanitizing data before sending to Prisma
*/
const internalUserServerSettingsProperties = {
	serverId: z.string(),
	userId: z.string(),
	bitfield: z.number(),
} as const;

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
export const zUserServerSettingsFlags = z.object({
	canPubliclyDisplayMessages: z.boolean(),
	messageIndexingDisabled: z.boolean(),
});

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
