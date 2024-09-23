import type { z } from 'zod';
import { upsertServer } from './server';
import { upsert, upsertMany } from './utils/operations';
import { deleteManyMessagesByChannelId } from './message';
import { omit } from '@answeroverflow/utils';
import { DBError } from './utils/error';
import { ChannelType } from 'discord-api-types/v10';
import { NUMBER_OF_CHANNEL_MESSAGES_TO_LOAD } from '@answeroverflow/constants';
import { db, dbReplica } from './db';
import { and, desc, eq, inArray, isNotNull, lt, not, sql } from 'drizzle-orm';
import { Channel, channelSchema, dbChannels, dbMessages } from './schema';
import {
	getDefaultChannel,
	getDefaultChannelWithFlags,
} from './utils/channelUtils';
import {
	addFlagsToChannel,
	channelBitfieldFlags,
	ChannelSettingsFlags,
	ChannelWithFlags,
	zChannelCreate,
	zChannelCreateMany,
	zChannelCreateWithDeps,
	zChannelMutable,
	zChannelUpdate,
	zChannelUpdateMany,
	zChannelUpsert,
	zChannelUpsertMany,
} from './zodSchemas/channelSchemas';
import { dictToBitfield } from './utils/bitfieldUtils';

const channelInsertSchema = channelSchema.omit({
	serverId: true,
	parentId: true,
	id: true,
	type: true,
});
export const CHANNELS_THAT_CAN_HAVE_AUTOTHREAD = new Set([
	ChannelType.GuildAnnouncement,
	ChannelType.GuildText,
]);

function applyChannelSettingsChangesSideEffects<
	F extends z.infer<typeof zChannelMutable>,
>({ old, updated }: { old: ChannelWithFlags; updated: F }) {
	const oldFlags = old.flags;
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
		pendingSettings.type !== ChannelType.GuildForum.valueOf() &&
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
	const data = await db.query.dbChannels.findFirst({
		where: eq(dbChannels.id, id),
	});
	if (!data) return null;
	return addFlagsToChannel(data);
}

export async function findChannelByInviteCode(
	inviteCode: string,
): Promise<ChannelWithFlags | null> {
	const data = await db.query.dbChannels.findFirst({
		where: eq(dbChannels.inviteCode, inviteCode),
	});
	if (!data) return null;
	return addFlagsToChannel(data);
}

export async function findAllThreadsByParentId(input: {
	parentId: string;
	limit?: number;
}): Promise<ChannelWithFlags[]> {
	const data = await db.query.dbChannels.findMany({
		where: eq(dbChannels.parentId, input.parentId),
		limit: input.limit,
	});
	return data.map(addFlagsToChannel);
}

export async function findAllChannelsByServerId(
	serverId: string,
): Promise<ChannelWithFlags[]> {
	const data = await db.query.dbChannels.findMany({
		where: eq(dbChannels.serverId, serverId),
	});
	return data.map(addFlagsToChannel);
}

export async function findManyChannelMessagesCounts(channelIds: string[]) {
	if (channelIds.length === 0) return Promise.resolve([]);
	return dbReplica
		.select({
			channelId: dbMessages.channelId,
			count: sql<number>`count(*)`,
		})
		.from(dbMessages)
		.where(inArray(dbMessages.channelId, channelIds))
		.groupBy(dbMessages.channelId);
}

export async function findLatestThreads(args: { take: number }) {
	const data = await dbReplica.query.dbChannels.findMany({
		where: eq(dbChannels.type, ChannelType.PublicThread),
		orderBy: desc(dbChannels.id),
		limit: args.take,
	});
	return data.map(addFlagsToChannel);
}

export async function findChannelMessageCount(channelId: string) {
	const data = await db
		.select({
			count: sql<number>`count(*)`,
		})
		.from(dbMessages)
		.where(eq(dbMessages.channelId, channelId));

	return data[0]?.count ?? 0;
}

export async function findManyChannelsById(
	ids: string[],
	opts: {
		includeMessageCount?: boolean;
	} = {},
): Promise<ChannelWithFlags[]> {
	if (ids.length === 0) return Promise.resolve([]);
	const data = await dbReplica.query.dbChannels.findMany({
		where: inArray(dbChannels.id, ids),
	});
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
		const threadMessageCounts = await findManyChannelMessagesCounts(threadIds);
		threadMessageCountLookup = new Map(
			threadMessageCounts.map((x) => [x.channelId, x.count]),
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
	const combinedData = applyChannelSettingsChangesSideEffects({
		old: getDefaultChannelWithFlags(data),
		updated: data,
	});
	await db.insert(dbChannels).values(combinedData);
	const created = await db.query.dbChannels.findFirst({
		where: eq(dbChannels.id, combinedData.id),
	});
	if (!created) throw new Error('Error creating channel');
	return addFlagsToChannel(created);
}

export async function createManyChannels(
	data: z.infer<typeof zChannelCreateMany>[],
) {
	for await (const channel of data) {
		await createChannel(channel);
	}
	return data.map((c) => getDefaultChannel({ ...c }));
}

export async function updateChannel({
	update,
	old,
}: {
	update: z.infer<typeof zChannelUpdate>;
	old: ChannelWithFlags | null;
}) {
	if (!old) old = await findChannelById(update.id);
	if (!old) throw new Error('Channel not found');
	const combinedData = applyChannelSettingsChangesSideEffects({
		old,
		updated: update,
	});
	await db
		.update(dbChannels)
		.set(channelInsertSchema.parse(combinedData))
		.where(eq(dbChannels.id, update.id));

	const updated = await db.query.dbChannels.findFirst({
		where: eq(dbChannels.id, update.id),
	});

	if (!updated) throw new Error('Error updating channel');

	return addFlagsToChannel(updated);
}

export async function updateManyChannels(
	data: z.infer<typeof zChannelUpdateMany>[],
) {
	const dataReturned: Channel[] = [];
	for await (const channel of data) {
		await db
			.update(dbChannels)
			.set(channelInsertSchema.parse(channel))
			.where(eq(dbChannels.id, channel.id));

		const updated = await db.query.dbChannels.findFirst({
			where: eq(dbChannels.id, channel.id),
		});
		if (!updated) throw new Error('Error updating channel');
		dataReturned.push(updated);
	}
	return dataReturned;
}

export async function deleteChannel(id: string) {
	await deleteManyMessagesByChannelId(id);
	// TODO: Ugly & how does this handle large amounts of threads?
	const threads = await db.query.dbChannels.findMany({
		where: and(eq(dbChannels.parentId, id), isNotNull(dbChannels.id)),
	});
	await Promise.all(threads.map((t) => deleteChannel(t.id)));
	return db.delete(dbChannels).where(eq(dbChannels.id, id));
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
				toUpdate
					.filter((c) => c.update)
					.map((c) => ({
						id: c.create.id,
						...c.update!,
					})),
			),
	});
}

export async function findChannelsBeforeId(input: {
	serverId: string;
	id: string;
	take?: number;
}) {
	const res = await db
		.select()
		.from(dbChannels)
		.where(
			and(
				eq(dbChannels.serverId, input.serverId),
				// @ts-expect-error
				lt(dbChannels.id, BigInt(input.id)),
			),
		)
		.orderBy(desc(dbChannels.id))
		.limit(input.take ?? 100);
	return res.map(addFlagsToChannel);
}

import Dataloader from 'dataloader';

export const channelCountsLoader = new Dataloader(
	async (ids: readonly string[]) => {
		const data = await findManyChannelMessagesCounts(ids as string[]);
		const lookup = new Map(data.map((x) => [x.channelId, x.count]));
		return ids.map((id) => lookup.get(id));
	},
);

export function findChannelMessagesById(
	channelId: string,
	opts?: {
		authorId?: string;
	},
) {
	const { authorId } = opts ?? {};
	return db.query.dbMessages.findMany({
		where: authorId
			? and(
					eq(dbMessages.channelId, channelId),
					eq(dbMessages.authorId, authorId),
				)
			: eq(dbMessages.channelId, channelId),
		orderBy: desc(dbMessages.id),
	});
}

export function channelFlagsToBitfield(newFlags: ChannelSettingsFlags) {
	return dictToBitfield(newFlags, channelBitfieldFlags);
}

export function findLatestThreadsFromAuthor(
	authorId: string,
	opts: {
		serverId?: string;
	},
) {
	// from db messages, select all messages where message id == channel id
	// order by message id desc
	// limit take
	return dbReplica.query.dbMessages.findMany({
		where: and(
			eq(dbMessages.authorId, authorId),
			eq(dbMessages.channelId, dbMessages.id),
			opts.serverId ? eq(dbMessages.serverId, opts.serverId) : undefined,
		),
		orderBy: desc(dbMessages.id),
		limit: 20,
	});
}

export async function findLatestCommentsFromAuthor(
	authorId: string,
	opts: {
		serverId?: string;
	},
) {
	return dbReplica
		.selectDistinct({ channelId: dbMessages.channelId, id: dbMessages.id })
		.from(dbMessages)
		.where(
			and(
				eq(dbMessages.authorId, authorId),
				not(eq(dbMessages.channelId, dbMessages.id)),
				opts.serverId ? eq(dbMessages.serverId, opts.serverId) : undefined,
			),
		)
		.orderBy(desc(dbMessages.id))
		.limit(20)
		.execute();
}

export function findServersUserHasPostedIn(authorId: string) {
	return dbReplica
		.selectDistinct({ serverId: dbMessages.serverId })
		.from(dbMessages)
		.where(
			and(
				eq(dbMessages.authorId, authorId),
				eq(dbMessages.channelId, dbMessages.id),
			),
		)
		.execute()
		.then((results) => results.map((x) => x.serverId));
}
