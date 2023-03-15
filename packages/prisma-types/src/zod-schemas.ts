import { z } from 'zod';
import { bitfieldToDict, dictToBitfield, mergeFlags, toDict } from './bitfield';
import { ChannelType } from 'discord-api-types/v10';
import type { Channel, Server, UserServerSettings } from '@prisma/client';

// TODO: Split up this file, it's become a bit bloated to prevent circular dependencies

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

export function toZObject<T extends readonly string[]>(...keys: T) {
	return z.object(toDict(() => z.boolean(), ...keys));
}

export const zUniqueArray = z
	.array(z.string())
	.transform((arr) => [...new Set(arr)]);

export const channelBitfieldFlags = [
	'indexingEnabled',
	'autoThreadEnabled',
	'markSolutionEnabled',
	'sendMarkSolutionInstructionsInNewThreads',
	'forumGuidelinesConsentEnabled',
] as const;

export const zChannelBitfieldFlags = toZObject(...channelBitfieldFlags);

type ChannelZodFormat = {
	[K in keyof Channel]: z.ZodTypeAny;
};
// Another option is https://github.com/jbranchaud/til/blob/master/zod/incorporate-existing-type-into-zod-schema.md
// However that approach doesn't allow us to extend / merge it with other zod schemas
export const zChannelPrisma = z.object({
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
	lastIndexedSnowflake: z.string().nullable(),
} satisfies ChannelZodFormat);

export const zChannelPrismaCreate = zChannelPrisma.partial().merge(
	zChannelPrisma.pick({
		id: true,
		name: true,
		serverId: true,
		type: true,
	}),
);

export const zChannelPrismaUpdate = zChannelPrisma.partial().omit({
	serverId: true,
	id: true,
	parentId: true,
});

export const zChannel = zChannelPrisma.required().extend({
	flags: zChannelBitfieldFlags,
	messageCount: z.number().optional(),
});

export type ChannelWithFlags = z.infer<typeof zChannel>;

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
	messageCount: true,
});

export type ChannelPublicWithFlags = z.infer<typeof zChannelPublic>;

export const serverSettingsFlags = ['readTheRulesConsentEnabled'] as const;
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
export const zServerPrisma = z.object({
	id: z.string(),
	name: z.string(),
	icon: z.string().nullable(),
	kickedTime: z.date().nullable(),
	description: z.string().nullable(),
	bitfield: z.number(),
} satisfies ServerZodFormat);

// For creating a server, we make sure to include the required fields
export const zServerPrismaCreate = zServerPrisma.partial().merge(
	zServerPrisma.pick({
		name: true,
		id: true,
	}),
);

// For updating a server, only the ID is required
export const zServerPrismaUpdate = zServerPrisma.partial().merge(
	zServerPrisma.pick({
		id: true,
	}),
);

export const zServer = zServerPrisma
	.required()
	.omit({
		bitfield: true,
	})
	.extend({
		flags: zServerSettingsFlags,
	});

export type ServerWithFlags = z.infer<typeof zServer>;

export const zServerPublic = zServer.pick({
	id: true,
	name: true,
	icon: true,
	description: true,
});

export type ServerPublicWithFlags = z.infer<typeof zServerPublic>;

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

export const zUserServerSettingsFlags = toZObject(...userServerSettingsFlags);

export const zUserServerSettings = z.object({
	userId: z.string(),
	serverId: z.string(),
	bitfield: z.number().optional(),
});

export const zUserServerSettingsWithFlags = zUserServerSettings.extend({
	flags: zUserServerSettingsFlags,
});

export const zDiscordAccount = z.object({
	id: z.string(),
	name: z.string(),
	avatar: z.string().nullable(),
});

export const zDiscordAccountPublic = zDiscordAccount.pick({
	id: true,
	name: true,
	avatar: true,
});
