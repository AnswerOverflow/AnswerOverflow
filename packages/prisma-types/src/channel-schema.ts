import { z } from 'zod';
import { bitfieldToDict } from './bitfield';
import { ChannelType } from 'discord-api-types/v10';
import type { Channel } from '@prisma/client';
import { toZObject } from './zod-utils';
import { omit, pick } from '@answeroverflow/utils';
import { zServerUpsert } from './server-schema';

export const ALLOWED_THREAD_TYPES = new Set([
	ChannelType.PublicThread,
	ChannelType.AnnouncementThread,
]);

export const ALLOWED_ROOT_CHANNEL_TYPES = new Set([
	ChannelType.GuildForum,
	ChannelType.GuildText,
	ChannelType.GuildAnnouncement,
]);

export const ALLOWED_CHANNEL_TYPES = new Set([
	...ALLOWED_ROOT_CHANNEL_TYPES,
	...ALLOWED_THREAD_TYPES,
]);

export const channelBitfieldFlags = [
	'indexingEnabled',
	'markSolutionEnabled',
	'sendMarkSolutionInstructionsInNewThreads',
	'autoThreadEnabled',
	'forumGuidelinesConsentEnabled',
] as const;

export const zChannelBitfieldFlags = toZObject(...channelBitfieldFlags);

type ChannelZodFormat = {
	[K in keyof Channel]: z.ZodTypeAny;
};

const internalChannelProperties = {
	id: z.string(),
	name: z.string(),
	serverId: z.string(),
	bitfield: z.number(),
	type: z.number().refine(
		(n) => ALLOWED_CHANNEL_TYPES.has(n),
		'Channel type can only be guild forum, text, or announcement', // TODO: Make a type error if possible
	),
	parentId: z.string().nullable(),
	inviteCode: z.string().nullable(),
	solutionTagId: z.string().nullable(),
	archivedTimestamp: z.preprocess((n) => {
		if (n === null) {
			return null;
		}
		if (
			typeof n === 'number' ||
			typeof n === 'bigint' ||
			typeof n === 'string'
		) {
			return BigInt(n);
		}
		return n;
	}, z.bigint().nullable()),
} as const satisfies ChannelZodFormat;

const internalRequiredChannelProperties = pick(
	internalChannelProperties,
	'id',
	'name',
	'serverId',
	'type',
	'parentId',
);

const internalMutableChannelProperties = z
	.object(omit(internalChannelProperties, 'id', 'parentId', 'type', 'serverId'))
	.partial().shape;

export const zChannelPrismaCreate = z.object({
	...internalMutableChannelProperties,
	...internalRequiredChannelProperties,
});

export const zChannelPrismaUpdate = z
	.object(omit(internalChannelProperties, 'id', 'serverId', 'parentId'))
	.partial();

const externalChannelProperties = {
	...omit(internalChannelProperties, 'bitfield'),
	flags: zChannelBitfieldFlags,
	messageCount: z.number().optional(),
} as const;

const externalChannelPropertiesMutable = z.object(
	omit(
		externalChannelProperties,
		'id',
		'serverId',
		'parentId',
		'type',
		'parentId',
	),
).shape;

const externalRequiredChannelProperties = pick(
	externalChannelProperties,
	'id',
	'name',
	'serverId',
	'type',
	'parentId',
);

export const zChannel = z.object({
	...externalChannelPropertiesMutable,
	...externalRequiredChannelProperties,
});

export type ChannelWithFlags = z.infer<typeof zChannel>;

export const zChannelMutable = z
	.object(externalChannelPropertiesMutable)
	.deepPartial();

export const zChannelCreate = z.object({
	...zChannelMutable.shape,
	...externalRequiredChannelProperties,
});

export const zChannelCreateMany = z.object(
	omit(
		{
			...externalChannelPropertiesMutable,
			...externalRequiredChannelProperties,
		},
		'flags',
	),
);

export const zChannelUpdateMany = z.object(
	omit(
		{
			...zChannelMutable.shape,
			id: externalRequiredChannelProperties.id,
		},
		'flags',
	),
);

export const zChannelUpdate = z.object({
	...zChannelMutable.shape,
	id: externalRequiredChannelProperties.id,
});

export const zChannelUpsert = z.object({
	create: zChannelCreate,
	update: zChannelMutable.optional(),
});

export const zChannelUpsertMany = z.array(
	z.object({
		create: zChannelCreateMany,
		update: z
			.object({
				...omit(zChannelUpdateMany.shape, 'id'),
			})
			.optional(),
	}),
);

export const zChannelCreateWithDeps = z.object({
	...externalChannelPropertiesMutable,
	...omit(externalRequiredChannelProperties, 'serverId'),
	server: zServerUpsert,
});

export const zChannelUpsertWithDeps = zChannelCreateWithDeps;

export const bitfieldToChannelFlags = (bitfield: number) =>
	bitfieldToDict(bitfield, channelBitfieldFlags);

export function addFlagsToChannel<
	T extends {
		bitfield: number;
	},
>(channel: T) {
	return {
		...channel,
		flags: bitfieldToChannelFlags(channel.bitfield),
	};
}

export const zChannelPublic = zChannel.pick({
	id: true,
	name: true,
	serverId: true,
	type: true,
	parentId: true,
	inviteCode: true,
	archivedTimestamp: true,
	messageCount: true,
});

export type ChannelPublicWithFlags = z.infer<typeof zChannelPublic>;
