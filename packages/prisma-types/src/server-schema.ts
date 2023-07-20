import type { Server } from '@prisma/client';
import { omit, pick } from '@answeroverflow/utils';
import { z } from 'zod';
import { toZObject } from './zod-utils';
import { bitfieldToDict, dictToBitfield, mergeFlags } from './bitfield';

export const serverSettingsFlags = [
	'readTheRulesConsentEnabled',
	'consentRequiredToDisplayMessagesDisabled',
] as const;
export const zServerSettingsFlags = toZObject(...serverSettingsFlags);

export const bitfieldToServerFlags = (bitfield: number) =>
	bitfieldToDict(bitfield, serverSettingsFlags);

export function addFlagsToServer<T extends Server>(serverSettings: T) {
	return {
		...serverSettings,
		flags: bitfieldToServerFlags(serverSettings.bitfield),
	};
}

export function mergeServerFlags(
	old: number,
	newFlags: Record<string, boolean>,
) {
	return mergeFlags(
		() => bitfieldToServerFlags(old),
		newFlags,
		(flags) => dictToBitfield(flags, serverSettingsFlags),
	);
}

// ! Prisma breaks if you call it with extra data that isn't in the model, this is used to strip that data out
type ServerZodFormat = {
	[K in keyof Server]: z.ZodTypeAny;
};

// A 1:1 copy of the Prisma model
const internalServerProperties = {
	id: z.string(),
	name: z.string(),
	icon: z.string().nullable(),
	kickedTime: z.date().nullable(),
	description: z.string().nullable(),
	bitfield: z.number(),
	vanityUrl: z.string().nullable(),
	customDomain: z.string().nullable(),
	stripeSubscriptionId: z.string().nullable(),
	stripeCustomerId: z.string().nullable(),
	plan: z.enum(['FREE', 'PRO', 'OPEN_SOURCE', 'ENTERPRISE']),
} as const satisfies ServerZodFormat;

const internalServerPropertiesMutable = z
	.object(omit(internalServerProperties, 'id'))
	.partial().shape;

const internalServerPropertiesRequired = pick(
	internalServerProperties,
	'id',
	'name',
);

export const zServerPrismaCreate = z.object({
	...internalServerPropertiesMutable,
	...internalServerPropertiesRequired,
});

export const zServerPrismaUpdate = z.object({
	...internalServerPropertiesMutable,
});

const externalServerProperties = {
	...omit(internalServerProperties, 'bitfield'),
	flags: zServerSettingsFlags,
} as const;

const externalServerPropertiesMutable = z
	.object(omit(externalServerProperties, 'id'))
  .deepPartial().shape;

const externalServerPropertiesRequired = pick(
	externalServerProperties,
	'id',
	'name',
);

export const zServer = z.object(externalServerProperties);
export type ServerWithFlags = z.infer<typeof zServer>;

export const zServerPublic = z.object(
	pick(
		externalServerProperties,
		'id',
		'name',
		'icon',
		'vanityUrl',
		'description',
		'kickedTime',
		'customDomain',
	),
);

export const zServerMutable = z.object(externalServerPropertiesMutable)

export const zServerRequired = z.object(externalServerPropertiesRequired);

export const zServerCreate = z.object({
	...externalServerPropertiesMutable,
	...externalServerPropertiesRequired,
});

export const zServerUpdate = z.object({
	...externalServerPropertiesMutable,
	id: externalServerPropertiesRequired.id,
});

export const zServerUpsert = z.object({
	create: zServerCreate,
	update: zServerMutable.optional(),
});

export type ServerPublicWithFlags = z.infer<typeof zServerPublic>;
