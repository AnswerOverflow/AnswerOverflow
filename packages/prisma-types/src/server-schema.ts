import type { Server } from '@prisma/client';
import { omit, pick } from '@answeroverflow/utils';
import { z } from 'zod';
import { zServerSettingsFlags } from './zod-schemas';

// ! Prisma breaks if you call it with extra data that isn't in the model, this is used to strip that data out
type ServerZodFormat = {
	[K in keyof Server]: z.ZodTypeAny;
};

// A 1:1 copy of the Prisma model
const serverPropertiesToZodTypes = {
	id: z.string(),
	name: z.string(),
	icon: z.string().nullable(),
	kickedTime: z.date().nullable(),
	description: z.string().nullable(),
	bitfield: z.number(),
	vanityUrl: z.string().nullable(),
} as const satisfies ServerZodFormat;

// Used for parsing the input before sending to prisma
export const zServerPrisma = z.object(serverPropertiesToZodTypes);

export const zServerPrismaCreate = zServerPrisma;

export const zServerPrismaUpdate = z.object(
	omit(serverPropertiesToZodTypes, 'id'),
);

export const zServer = z.object({
	...omit(serverPropertiesToZodTypes, 'bitfield'),
	flags: zServerSettingsFlags,
});

export type ServerWithFlags = z.infer<typeof zServer>;

export const zServerPublic = z.object({
	...pick(serverPropertiesToZodTypes, ['id', 'name', 'icon', 'description']),
});

export const serverMutablePropertiesToZodTypes = z
	.object(omit(serverPropertiesToZodTypes, 'id', 'bitfield'))
	.partial();

export const zServerMutable = z
	.object({
		...omit(serverPropertiesToZodTypes, 'id', 'bitfield'),
		flags: zServerSettingsFlags,
	})
	.deepPartial(); // TODO: partial this w/out zod?

export const zServerRequired = pick(serverPropertiesToZodTypes, ['id', 'name']);

export const zServerCreate = z.object({
	...zServerMutable.shape,
	...zServerRequired,
});

export const zServerUpdate = z.object({
	...zServerMutable.shape,
	id: zServerRequired.id,
});

export const zServerUpsert = z.object({
	create: zServerCreate,
	update: z.object(zServerMutable.shape),
});

export type ServerPublicWithFlags = z.infer<typeof zServerPublic>;
