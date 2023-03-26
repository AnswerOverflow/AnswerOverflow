import type { DiscordAccount } from '@prisma/client';
import { omit, pick } from '@answeroverflow/utils';
import { z } from 'zod';

type DiscordAccountZodFormat = {
	[K in keyof DiscordAccount]: z.ZodTypeAny;
};

const internalDiscordAccountProperties = {
	id: z.string(),
	name: z.string(),
	avatar: z.string().nullable(),
} as const satisfies DiscordAccountZodFormat;

const internalDiscordAccountPropertiesMutable = z
	.object(omit(internalDiscordAccountProperties, 'id'))
	.partial().shape;

const internalDiscordAccountPropertiesRequired = pick(
	internalDiscordAccountProperties,
	['id', 'name'],
);

export const zDiscordAccountPrismaCreate = z.object({
	...internalDiscordAccountPropertiesMutable,
	...internalDiscordAccountPropertiesRequired,
});

export const zDiscordAccountPrismaUpdate = z.object(
	omit(internalDiscordAccountProperties, 'id'),
);

export const zDiscordAccount = z.object(internalDiscordAccountProperties);

export const zDiscordAccountPublic = z.object(
	pick(internalDiscordAccountProperties, ['id', 'name', 'avatar']),
);

export const zDiscordAccountRequired = z.object(
	internalDiscordAccountPropertiesRequired,
);

export const zDiscordAccountMutable = z.object(
	internalDiscordAccountPropertiesMutable,
);

export const zDiscordAccountCreate = z.object({
	...internalDiscordAccountPropertiesMutable,
	...internalDiscordAccountPropertiesRequired,
});

export const zDiscordAccountUpdate = z.object({
	...internalDiscordAccountPropertiesMutable,
	id: internalDiscordAccountPropertiesRequired.id,
});
export const zDiscordAccountUpsert = zDiscordAccountCreate;
