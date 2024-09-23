/*
We're moving away from finding the largest message id in a channel to find the last indexed message.
Instead we're storing it after indexing has completed in the channel's table
We're going to be using this script to apply the last indexed message to all channels that don't have it
The default for last indexed message will be 0 so this is needed to not reindex content
Threads will be skipped as they are pretty cheap to index
*/

import { db } from '../src/db';
import { dbChannels, dbMessages } from '../src/schema';
import { ChannelType } from 'discord-api-types/v10';
import {
	addFlagsToChannel,
	channelBitfieldValues,
} from '../src/zodSchemas/channelSchemas';
import { and, eq, or, sql } from 'drizzle-orm';
import { updateChannel } from '../src/channel';

const applyLastIndexed = async () => {
	const channelsWithIndexingEnabled = await db.query.dbChannels.findMany({
		where: and(
			or(
				eq(dbChannels.type, ChannelType.GuildAnnouncement),
				eq(dbChannels.type, ChannelType.GuildText),
				eq(dbChannels.type, ChannelType.GuildForum),
			),
			sql`${dbChannels.bitfield} & ${channelBitfieldValues.indexingEnabled} > 0`,
		),
	});
	console.log(
		`Found ${channelsWithIndexingEnabled.length} channels with indexing enabled`,
	);

	let i = 0;
	for await (const channel of channelsWithIndexingEnabled) {
		const latestThread = await db.query.dbMessages.findFirst({
			where:
				channel.type === ChannelType.GuildForum.valueOf()
					? eq(dbMessages.parentChannelId, channel.id)
					: eq(dbMessages.channelId, channel.id),
			orderBy: sql`CAST(${dbMessages.id} AS SIGNED) DESC`,
		});

		if (!latestThread) continue;
		const lastIndexedSnowflake = latestThread.id;
		console.log(
			`Updating channel ${
				channel.id
			} with last indexed snowflake ${lastIndexedSnowflake} (${i++}/${
				channelsWithIndexingEnabled.length
			})`,
		);
		await updateChannel({
			old: addFlagsToChannel(channel),
			update: {
				id: channel.id,
				lastIndexedSnowflake,
			},
		});
	}
	// console.log(`Found ${forumChannels.length} forum channels`);
	// console.log(`Found ${latestForumThreads.length} latest forum threads`);
	// console.log(latestForumThreads);
};
void applyLastIndexed();
