import { z } from 'zod';
import { upsertServer, zServerUpsert } from './server';
import { upsert, upsertMany } from './utils/operations';
import {
	addFlagsToChannel,
	ALLOWED_THREAD_TYPES,
	bitfieldToChannelFlags,
	channelBitfieldFlags,
	ChannelWithFlags,
	zChannel,
	zChannelPrismaCreate,
	zChannelPrismaUpdate,
} from '@answeroverflow/prisma-types';
import {
	prisma,
	getDefaultChannel,
	Channel,
} from '@answeroverflow/prisma-types';
import { dictToBitfield } from '@answeroverflow/prisma-types/src/bitfield';
import { deleteManyMessagesByChannelId } from './message';
import { omit } from '@answeroverflow/utils';
import { elastic } from '@answeroverflow/elastic-types';
import { DBError } from './utils/error';
import { ChannelType } from 'discord-api-types/v10';
import { NUMBER_OF_CHANNEL_MESSAGES_TO_LOAD } from '@answeroverflow/constants';
export const CHANNELS_THAT_CAN_HAVE_AUTOTHREAD = new Set([
	ChannelType.GuildAnnouncement,
	ChannelType.GuildText,
]);

export const zChannelRequired = zChannel.pick({
	id: true,
	name: true,
	serverId: true,
	type: true,
	parentId: true,
});

export const zChannelMutable = zChannel
	.pick({
		name: true,
		flags: true,
		inviteCode: true,
		solutionTagId: true,
		lastIndexedSnowflake: true,
	})
	.deepPartial();

export const zChannelCreate = zChannelMutable.merge(zChannelRequired);

export const zChannelCreateMany = zChannelCreate.omit({
	flags: true,
});

export const zChannelUpsert = z.object({
	create: zChannelCreate,
	update: zChannelMutable.optional(),
});

export const zChannelUpdate = zChannelMutable.merge(
	zChannelRequired.pick({
		id: true,
	}),
);

// We omit flags because it's too complicated to update many of them
export const zChannelUpdateMany = zChannelUpdate.omit({
	flags: true,
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

export const zThreadCreate = zChannelCreate.extend({
	parentId: z.string(),
	type: z
		.number()
		.refine(
			(n) => ALLOWED_THREAD_TYPES.has(n),
			'Can only create public threads',
		), // TODO: Make a type error if possible
});

export const zChannelCreateWithDeps = zChannelCreate
	.omit({
		serverId: true, // Taken from server
	})
	.extend({
		server: zServerUpsert,
	});

export const zChannelUpsertWithDeps = zChannelCreateWithDeps;

export const zThreadCreateWithDeps = zThreadCreate
	.omit({
		parentId: true, // Taken from parent
		serverId: true, // Taken from parent
	})
	.extend({
		parent: zChannelUpsertWithDeps,
	});

export const zThreadUpsertWithDeps = zThreadCreateWithDeps;

function applyChannelSettingsChangesSideEffects<
	F extends z.infer<typeof zChannelMutable>,
>({ old, updated }: { old: Channel; updated: F }) {
	const oldFlags = bitfieldToChannelFlags(old.bitfield);
	const flagsToUpdate = updated.flags ?? {};

	const pendingSettings: ChannelWithFlags = {
		...old,
		...updated,
		flags: {
			...oldFlags,
			...flagsToUpdate,
		},
	};

	// User is trying to enable sending mark solution instructions in new threads without enabling mark solution
	if (
		flagsToUpdate.sendMarkSolutionInstructionsInNewThreads &&
		!pendingSettings.flags.markSolutionEnabled
	) {
		throw new DBError(
			'Cannot enable sendMarkSolutionInstructionsInNewThreads without enabling markSolutionEnabled',
			'INVALID_CONFIGURATION',
		);
	}

	// Throw error if enabling forum post guidelines consent for a non forum channel
	if (
		pendingSettings.type !== ChannelType.GuildForum &&
		pendingSettings.flags.forumGuidelinesConsentEnabled
	) {
		throw new DBError(
			'Cannot enable readTheRulesConsentEnabled for a non forum channel',
			'INVALID_CONFIGURATION',
		);
	}
	// Throw error if enabling auto thread for a non valid threadable channel
	if (
		!CHANNELS_THAT_CAN_HAVE_AUTOTHREAD.has(pendingSettings.type) &&
		pendingSettings.flags.autoThreadEnabled
	) {
		throw new DBError(
			'Cannot enable autoThreadEnabled for a non threadable channel',
			'INVALID_CONFIGURATION',
		);
	}

	if (!pendingSettings.flags.indexingEnabled) {
		// TODO: Emit a cron job here to run in X minutes / hours to clean up the channel, delay incase the user accidentally disabled indexing
		pendingSettings.lastIndexedSnowflake = null;
		pendingSettings.inviteCode = null;
	}

	if (!pendingSettings.flags.markSolutionEnabled) {
		pendingSettings.flags.sendMarkSolutionInstructionsInNewThreads = false;
	}

	// TODO: Maybe throw error if indexing enabled and inviteCode is null?
	const bitfield = dictToBitfield(pendingSettings.flags, channelBitfieldFlags);
	return {
		...pendingSettings,
		bitfield,
	};
}

export async function findChannelById(
	id: string,
): Promise<ChannelWithFlags | null> {
	const data = await prisma.channel.findUnique({ where: { id } });
	if (!data) return null;
	return addFlagsToChannel(data);
}

export async function findChannelByInviteCode(
	inviteCode: string,
): Promise<ChannelWithFlags | null> {
	const data = await prisma.channel.findUnique({ where: { inviteCode } });
	if (!data) return null;
	return addFlagsToChannel(data);
}

export async function findManyChannelsById(
	ids: string[],
	opts: {
		includeMessageCount?: boolean;
	} = {},
): Promise<ChannelWithFlags[]> {
	const data = await prisma.channel.findMany({ where: { id: { in: ids } } });
	const withFlags = data.map(addFlagsToChannel);
	let threadMessageCountLookup: Map<string, number | undefined> | undefined =
		undefined;
	const isThreadType = (t: ChannelType) =>
		t === ChannelType.PublicThread ||
		t === ChannelType.PrivateThread ||
		t === ChannelType.AnnouncementThread;
	if (opts.includeMessageCount) {
		const threadIds = withFlags
			.filter((c) => isThreadType(c.type))
			.map((c) => c.id);
		const threadMessageCounts = await Promise.all(
			threadIds.map((id) => elastic.getChannelMessagesCount(id)),
		);
		threadMessageCountLookup = new Map(
			threadIds.map((id, i) => [id, threadMessageCounts[i] ?? undefined]),
		);
	}
	return withFlags.map((c) => {
		let messageCount: number | undefined = undefined;
		if (opts.includeMessageCount) {
			if (isThreadType(c.type)) {
				messageCount = threadMessageCountLookup?.get(c.id);
			} else {
				messageCount = NUMBER_OF_CHANNEL_MESSAGES_TO_LOAD;
			}
		}
		return {
			...c,
			messageCount,
		};
	});
}

export async function createChannel(data: z.infer<typeof zChannelCreate>) {
	const combinedData: z.infer<typeof zChannelPrismaCreate> =
		applyChannelSettingsChangesSideEffects({
			old: getDefaultChannel(data),
			updated: data,
		});
	const created = await prisma.channel.create({
		data: zChannelPrismaCreate.parse(combinedData),
	});
	return addFlagsToChannel(created);
}

export async function createManyChannels(
	data: z.infer<typeof zChannelCreateMany>[],
) {
	await prisma.channel.createMany({
		data: data.map((c) => zChannelCreateMany.parse(c)),
	});
	return data.map((c) => getDefaultChannel({ ...c }));
}

export async function updateChannel({
	update,
	old,
}: {
	update: z.infer<typeof zChannelUpdate>;
	old: Channel | null;
}) {
	if (!old) old = await findChannelById(update.id);
	if (!old) throw new Error('Channel not found');
	const combinedData: z.infer<typeof zChannelPrismaUpdate> =
		applyChannelSettingsChangesSideEffects({
			old,
			updated: update,
		});
	const updated = await prisma.channel.update({
		where: { id: update.id },
		data: zChannelPrismaUpdate.parse(combinedData),
	});
	return addFlagsToChannel(updated);
}

export async function updateManyChannels(
	data: z.infer<typeof zChannelUpdateMany>[],
) {
	const updated = await prisma.$transaction(
		data.map((c) =>
			prisma.channel.update({
				where: { id: c.id },
				data: zChannelPrismaUpdate.parse(c),
			}),
		),
	);
	return updated.map(addFlagsToChannel);
}

export async function deleteChannel(id: string) {
	await deleteManyMessagesByChannelId(id);
	// TODO: Ugly & how does this handle large amounts of threads?
	const threads = await prisma.channel.findMany({
		where: { parentId: id },
		select: { id: true },
	});
	await Promise.all(threads.map((t) => deleteChannel(t.id)));
	return prisma.channel.delete({ where: { id } });
}

export async function createChannelWithDeps(
	data: z.infer<typeof zChannelCreateWithDeps>,
) {
	await upsertServer(data.server);
	return createChannel({
		serverId: data.server.create.id,
		...omit(data, 'server'),
	});
}

export function upsertChannel(data: z.infer<typeof zChannelUpsert>) {
	return upsert({
		create: () => createChannel(data.create),
		update: (old) =>
			updateChannel({
				update: {
					id: data.create.id,
					...data.update,
				},
				old,
			}),
		find: () => findChannelById(data.create.id),
	});
}

export function upsertManyChannels(data: z.infer<typeof zChannelUpsertMany>) {
	return upsertMany({
		input: data,
		find: () => findManyChannelsById(data.map((c) => c.create.id)),
		getInputId(input) {
			return input.create.id;
		},
		getFetchedDataId(input) {
			return input.id;
		},
		create: (toCreate) => createManyChannels(toCreate.map((c) => c.create)),
		update: (toUpdate) =>
			updateManyChannels(
				toUpdate.map((c) => ({
					id: c.create.id,
					...c.update,
				})),
			),
	});
}
