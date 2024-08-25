import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { ChannelType, EmbedBuilder, Events, Guild } from 'discord.js';
import {
	ALLOWED_ROOT_CHANNEL_TYPES,
	upsertServer,
	upsertManyChannels,
	findAllServers,
	updateServer,
} from '@answeroverflow/db';
import { delay } from '@answeroverflow/discordjs-mock';
import { registerServerGroup } from '@answeroverflow/analytics';
import { sharedEnvs } from '@answeroverflow/env/shared';
import {
	serverWithDiscordInfoToAnalyticsData,
	trackDiscordEvent,
} from '../../utils/analytics';
import {
	toAOServer,
	getMemberCount,
	toAOChannel,
} from '../../utils/conversions';
import { leaveServerIfNecessary } from '../../utils/denylist';
import { uploadFileFromUrl } from '@answeroverflow/db/src/files';

/*
  Guild related events are tracked here, this may make sense to split into multiple files as the complexity grows.
*/

// Sync server properties that aren't set by the user
async function autoUpdateServerInfo(guild: Guild) {
	const convertedServer = toAOServer(guild);
	const upserted = await upsertServer({
		create: convertedServer,
		update: {
			icon: convertedServer.icon,
			name: convertedServer.name,
			description: convertedServer.description,
			kickedTime: null,
			vanityInviteCode: convertedServer.vanityInviteCode,
			approximateMemberCount:
				getMemberCount(guild) > 0 ? getMemberCount(guild) : undefined,
		},
	});
	// if it has a custom domain, upload their server icon to s3
	if (upserted.customDomain && upserted.icon) {
		await uploadFileFromUrl({
			id: upserted.id,
			filename: `${upserted.icon}/icon.png`,
			url: `https://cdn.discordapp.com/icons/${upserted.id}/${upserted.icon}.png?size=${48}`,
		});
	}
	registerServerGroup(
		serverWithDiscordInfoToAnalyticsData({
			guild,
			serverWithSettings: upserted,
		}),
	);
	return upserted;
}

async function syncServer(guild: Guild) {
	// If the server doesn't exist we want to initialize it with the default values
	const updated = await autoUpdateServerInfo(guild);
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
	return updated;
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
		if (sharedEnvs.NODE_ENV === 'production') await delay(600 * 1000); // give time for dbs to start up
		// 1. Sync all of the servers to have the most up to date data
		const guilds = this.container.client.guilds.cache.sort(
			// sort by member count to give priority to larger servers
			(a, b) => b.memberCount - a.memberCount,
		);
		// default values are dev servers
		const activeServerIds = new Set(['300', '402']);
		for await (const guild of guilds.values()) {
			// eslint-disable-next-line no-await-in-loop
			try {
				this.container.logger.info(`Syncing guild ${guild.name}`);
				await syncServer(guild);
			} catch (error) {
				this.container.logger.error(
					`Error syncing guild ${guild.name}: ${error as string}`,
				);
			}
			// dont kick in error
			activeServerIds.add(guild.id);
		}
		// 2. For any servers that are in the database and not in the guilds the bot is in, mark them as kicked
		const servers =
			sharedEnvs.NODE_ENV === 'test' ? [] : await findAllServers();
		const serversToMarkAsKicked = servers.filter(
			(server) => !activeServerIds.has(server.id) && !server.kickedTime,
		);

		for await (const server of serversToMarkAsKicked.values()) {
			// eslint-disable-next-line no-await-in-loop
			this.container.logger.info(`Marking server ${server.name} as kicked`);
			await updateServer({
				existing: server,
				update: {
					id: server.id,
					kickedTime: new Date(),
				},
			});
		}

		for await (const server of guilds.values())
			await leaveServerIfNecessary(server);
	}
}
@ApplyOptions<Listener.Options>({
	event: Events.GuildCreate,
	name: 'Guild Sync On Join',
})
export class SyncOnJoin extends Listener {
	public async run(guild: Guild) {
		const leftServer = await leaveServerIfNecessary(guild);
		if (leftServer) return;
		const synced = await syncServer(guild);
		trackDiscordEvent('Server Join', {
			...serverWithDiscordInfoToAnalyticsData({
				guild,
				serverWithSettings: synced,
			}),
			'Answer Overflow Account Id': guild.ownerId, // <---TODO: Not a great id to track with but best we've got
		});
		if (sharedEnvs.NODE_ENV !== 'test') {
			const rhysUser =
				await this.container.client.users.fetch('523949187663134754');
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
		const upserted = await upsertServer({
			create: {
				...toAOServer(guild),
				kickedTime: new Date(),
			},
			update: { kickedTime: new Date() },
		});
		trackDiscordEvent('Server Leave', {
			'Answer Overflow Account Id': guild.ownerId, // <---TODO: Not a great id to track with but best we've got
			...serverWithDiscordInfoToAnalyticsData({
				guild,
				serverWithSettings: upserted,
			}),
		});
		if (sharedEnvs.NODE_ENV !== 'test') {
			const rhysUser =
				await this.container.client.users.fetch('523949187663134754');
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
