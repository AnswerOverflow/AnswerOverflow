import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { ChannelType, EmbedBuilder, Events, Guild } from 'discord.js';
import {
	ALLOWED_ROOT_CHANNEL_TYPES,
	upsertServer,
	upsertManyChannels,
} from '@answeroverflow/db';
import { toAOChannel, toAOServer } from '~discord-bot/utils/conversions';
import { delay } from '@answeroverflow/discordjs-mock';
import { trackServerSideEvent } from '@answeroverflow/analytics';

/*
  Guild related events are tracked here, this may make sense to split into multiple files as the complexity grows.
*/

// Sync server properties that aren't set by the user
async function autoUpdateServerInfo(guild: Guild) {
	const convertedServer = toAOServer(guild);
	await upsertServer({
		create: convertedServer,
		update: {
			icon: convertedServer.icon,
			name: convertedServer.name,
			description: convertedServer.description,
			kickedTime: null,
		},
	});
}

async function syncServer(guild: Guild) {
	// If the server doesn't exist we want to initialize it with the default values
	await autoUpdateServerInfo(guild);
	const channelsToUpsert = guild.channels.cache.filter((channel) =>
		ALLOWED_ROOT_CHANNEL_TYPES.has(channel.type),
	);
	await upsertManyChannels(
		channelsToUpsert.map((channel) => ({
			create: toAOChannel(channel),
			update: {
				name: channel.name,
			},
		})),
	);
	return guild;
}

function makeGuildEmbed(guild: Guild, joined: boolean) {
	const numberOfForumChannels = guild.channels.cache
		.filter((c) => c.type === ChannelType.GuildForum)
		.size.toString();
	return new EmbedBuilder()
		.setTitle(joined ? 'Joined Server' : 'Left Server')
		.setDescription(
			joined ? `Joined server ${guild.name}` : `Left server ${guild.name}`,
		)
		.setThumbnail(guild.iconURL())
		.setTimestamp()
		.setColor(joined ? 'Green' : 'Red')
		.setImage(guild.bannerURL() ?? guild.splashURL())
		.setFields([
			{
				name: 'Members',
				value: guild.memberCount.toString(),
				inline: true,
			},
			{
				name: 'Forum Channels',
				value: numberOfForumChannels,
				inline: true,
			},
			{
				name: 'Age',
				value: guild.createdAt.toDateString(),
				inline: false,
			},
			{
				name: 'Id',
				value: guild.id,
				inline: false,
			},
		]);
}

@ApplyOptions<Listener.Options>({ once: true, event: Events.ClientReady })
export class SyncOnReady extends Listener {
	public async run() {
		if (process.env.NODE_ENV === 'production') await delay(30 * 1000); // give time for dbs to start up
		// 1. Sync all of the servers to have the most up to date data
		const guilds = this.container.client.guilds.cache;
		const syncs = guilds.map((guild) => syncServer(guild));
		for await (const sync of syncs) {
			this.container.logger.info(`Synced server ${sync.name}`);
		}
		// 2. For any servers that are in the database and not in the guilds the bot is in, mark them as kicked
	}
}
@ApplyOptions<Listener.Options>({
	event: Events.GuildCreate,
	name: 'Guild Sync On Join',
})
export class SyncOnJoin extends Listener {
	public async run(guild: Guild) {
		await syncServer(guild);
		trackServerSideEvent('Server Join', {
			'Server Id': guild.id,
			'Server Name': guild.name,
			'Answer Overflow Account Id': guild.ownerId, // <---TODO: Not a great id to track with but best we've got
		});
		if (process.env.NODE_ENV !== 'test') {
			const rhysUser = await this.container.client.users.fetch(
				'523949187663134754',
			);
			await rhysUser.send({
				embeds: [makeGuildEmbed(guild, true)],
			});
		}
	}
}

/*
 * On delete, we want to mark the server as kicked, but we don't want to delete it from the database.
 * This is incase someone is just temporarily kicking the bot, and we don't want to lose all of the data.
 * A background job will periodically clean up servers that have been kicked for a long time.
 */
@ApplyOptions<Listener.Options>({
	event: Events.GuildDelete,
	name: 'Guild Sync On Delete',
})
export class SyncOnDelete extends Listener {
	public async run(guild: Guild) {
		await upsertServer({
			create: {
				...toAOServer(guild),
				kickedTime: new Date(),
			},
			update: { kickedTime: new Date() },
		});
		if (process.env.NODE_ENV !== 'test') {
			const rhysUser = await this.container.client.users.fetch(
				'523949187663134754',
			);
			await rhysUser.send({
				embeds: [makeGuildEmbed(guild, false)],
			});
		}
	}
}

@ApplyOptions<Listener.Options>({
	event: Events.GuildUpdate,
	name: 'Guild Sync On Update',
})
export class SyncOnUpdate extends Listener {
	public async run(_: Guild, newGuild: Guild) {
		await autoUpdateServerInfo(newGuild);
	}
}
