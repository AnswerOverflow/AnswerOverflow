import { z } from 'zod';
import { ChannelType } from 'discord-api-types/v10';
import { zServerUpsert } from './serverSchemas';
import { bitfieldToDict } from '../utils/bitfieldUtils';
import { channelSchema } from '../schema';

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

export const channelBitfieldValues = {
	indexingEnabled: 1 << 0,
	markSolutionEnabled: 1 << 1,
	sendMarkSolutionInstructionsInNewThreads: 1 << 2,
	autoThreadEnabled: 1 << 3,
	forumGuidelinesConsentEnabled: 1 << 4,
} as const;

export const zChannelBitfieldFlags = z.object({
	indexingEnabled: z.boolean(),
	markSolutionEnabled: z.boolean(),
	sendMarkSolutionInstructionsInNewThreads: z.boolean(),
	autoThreadEnabled: z.boolean(),
	forumGuidelinesConsentEnabled: z.boolean(),
});
export type ChannelSettingsFlags = z.infer<typeof zChannelBitfieldFlags>;

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const zChannelSchema = channelSchema.required().extend({
	flags: zChannelBitfieldFlags,
	type: z.number().refine(
		(n) => ALLOWED_CHANNEL_TYPES.has(n),
		'Channel type can only be guild forum, text, or announcement', // TODO: Make a type error if possible
	),
	messageCount: z.number().optional(),
	id: z.string(),
});

export const zChannelMutable = zChannelSchema
	.omit({
		id: true,
		parentId: true,
		type: true,
		serverId: true,
	})
	.deepPartial();

export const zChannelRequired = zChannelSchema.pick({
	id: true,
	name: true,
	serverId: true,
	type: true,
	parentId: true,
});

export const zChannelCreate = z.object({
	...zChannelMutable.shape,
	...zChannelRequired.shape,
});

export type ChannelWithFlags = Omit<z.infer<typeof zChannelSchema>, 'bitfield'>;

export const zChannelCreateMany = zChannelCreate.omit({
	flags: true,
});

export const zChannelUpdateMany = zChannelMutable
	.omit({
		flags: true,
	})
	.extend({
		id: zChannelSchema.shape.id,
	});

export const zChannelUpdate = zChannelMutable.extend({
	id: zChannelSchema.shape.id,
});

export const zChannelUpsert = z.object({
	create: zChannelCreate,
	update: zChannelMutable.optional(),
});

export const zChannelUpsertMany = z.array(
	z.object({
		create: zChannelCreateMany,
		update: zChannelUpdateMany
			.omit({
				id: true,
			})
			.optional(),
	}),
);

export const zChannelCreateWithDeps = z.object({
	...zChannelCreate.omit({
		serverId: true,
	}).shape,
	server: zServerUpsert,
});

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

export const zChannelPublic = zChannelSchema.pick({
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
