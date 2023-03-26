import { z } from 'zod';
import { bitfieldToDict, dictToBitfield, mergeFlags, toDict } from './bitfield';
import { ChannelType } from 'discord-api-types/v10';
import type {
	Channel,
	DiscordAccount,
	Server,
	UserServerSettings,
} from '@prisma/client';

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
	'markSolutionEnabled',
	'sendMarkSolutionInstructionsInNewThreads',
	'autoThreadEnabled',
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
	archivedTimestamp: true,
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
// A 1:1 copy of the Prisma model
export const zUserServerSettingsPrisma = z.object({
	serverId: z.string(),
	userId: z.string(),
	bitfield: z.number(),
} satisfies UserServerSettingsZodFormat);

// For creating a server, we make sure to include the required fields
export const zUserServerSettingsPrismaCreate = zUserServerSettingsPrisma
	.partial()
	.merge(
		zUserServerSettingsPrisma.pick({
			serverId: true,
			userId: true,
		}),
	);

// For updating a server, only the ID is required
export const zUserServerSettingsPrismaUpdate = zUserServerSettingsPrisma
	.partial()
	.omit({
		serverId: true,
		userId: true,
	});

export const zUserServerSettings = zUserServerSettingsPrisma;
export const zUserServerSettingsFlags = toZObject(...userServerSettingsFlags);

export const zUserServerSettingsWithFlags = zUserServerSettings.extend({
	flags: zUserServerSettingsFlags,
});

type DiscordAccountZodFormat = {
	[K in keyof DiscordAccount]: z.ZodTypeAny;
};

export const zDiscordAccountPrisma = z.object({
	id: z.string(),
	name: z.string(),
	avatar: z.string().nullable(),
} satisfies DiscordAccountZodFormat);

export const zDiscordAccountPrismaCreate = zDiscordAccountPrisma
	.partial()
	.merge(
		zDiscordAccountPrisma.pick({
			id: true,
			name: true,
		}),
	);

export const zDiscordAccountPrismaUpdate = zDiscordAccountPrisma
	.partial()
	.omit({
		id: true,
	});

export const zDiscordAccount = zDiscordAccountPrisma;

export const zDiscordAccountPublic = zDiscordAccount.pick({
	id: true,
	name: true,
	avatar: true,
});
