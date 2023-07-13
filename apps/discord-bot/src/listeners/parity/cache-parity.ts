import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, GuildMember, User } from 'discord.js';
import {
	addServerToUserServerCache,
	removeServerFromUserCache,
	updateCachedDiscordUser,
} from '@answeroverflow/cache';
import {
	findDiscordOauthByProviderAccountId,
	findServerById,
} from '@answeroverflow/db';
import { toDiscordAPIServer } from '~discord-bot/utils/conversions';
import {
	memberToAnalyticsUser,
	serverWithDiscordInfoToAnalyticsData,
	trackDiscordEvent,
} from '~discord-bot/utils/analytics';

@ApplyOptions<Listener.Options>({
	event: Events.GuildMemberAdd,
	name: 'UpdateUserServerCacheOnAdd',
})
export class SyncOnAdd extends Listener {
	public async run(member: GuildMember) {
		const account = await findDiscordOauthByProviderAccountId(member.user.id);
		if (!account || !account.access_token) return;
		await addServerToUserServerCache({
			accessToken: account.access_token,
			server: toDiscordAPIServer(member),
		});
		const server = await findServerById(member.guild.id);
		if (!server) return;
		trackDiscordEvent('User Joined Server', {
			...serverWithDiscordInfoToAnalyticsData({
				guild: member.guild,
				serverWithSettings: server,
			}),
			...memberToAnalyticsUser('User', member),
			'Answer Overflow Account Id': member.id,
		});
	}
}

@ApplyOptions<Listener.Options>({
	event: Events.GuildMemberRemove,
	name: 'UpdateUserServerCacheOnRemove',
})
export class SyncOnRemove extends Listener {
	public async run(member: GuildMember) {
		const account = await findDiscordOauthByProviderAccountId(member.user.id);
		if (!account || !account.access_token) return;
		const guild = member.guild;
		await removeServerFromUserCache({
			accessToken: account.access_token,
			serverId: guild.id,
		});
		const server = await findServerById(guild.id);
		if (!server) return;
		trackDiscordEvent('User Left Server', {
			...serverWithDiscordInfoToAnalyticsData({
				guild,
				serverWithSettings: server,
			}),
			...memberToAnalyticsUser('User', member),
			'Answer Overflow Account Id': member.id,
		});
	}
}

@ApplyOptions<Listener.Options>({
	event: Events.UserUpdate,
	name: 'UpdateUserServerCacheOnUpdate',
})
export class SyncOnUpdate extends Listener {
	public async run(_: User, newUser: User) {
		const account = await findDiscordOauthByProviderAccountId(newUser.id);
		if (!account || !account.access_token) return;
		await updateCachedDiscordUser(account.access_token, {
			...account,
			// We only need to update the avatar, username, and discriminator
			avatar: newUser.avatar,
			username: newUser.username,
			discriminator: newUser.discriminator,
		});
	}
}
