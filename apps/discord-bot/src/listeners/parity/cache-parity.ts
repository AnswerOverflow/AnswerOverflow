import { Auth } from '@answeroverflow/core/auth';
import { findServerById } from '@answeroverflow/core/server';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, GuildMember, User } from 'discord.js';
import {
	memberToAnalyticsUser,
	serverWithDiscordInfoToAnalyticsData,
	trackDiscordEvent,
} from '../../utils/analytics';
import { toDiscordAPIServer } from '../../utils/conversions';

@ApplyOptions<Listener.Options>({
	event: Events.GuildMemberAdd,
	name: 'UpdateUserServerCacheOnAdd',
})
export class SyncOnAdd extends Listener {
	public async run(member: GuildMember) {
		try {
			const account = await Auth.findDiscordOauthByProviderAccountId(
				member.user.id,
			);
			if (!account || !account.access_token) return;
			await Auth.addServerToUserServerCache({
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
		} catch (error) {
			console.error('Error in UpdateUserServerCacheOnAdd:', error);
		}
	}
}

@ApplyOptions<Listener.Options>({
	event: Events.GuildMemberRemove,
	name: 'UpdateUserServerCacheOnRemove',
})
export class SyncOnRemove extends Listener {
	public async run(member: GuildMember) {
		try {
			const account = await Auth.findDiscordOauthByProviderAccountId(
				member.user.id,
			);
			if (!account || !account.access_token) return;
			const guild = member.guild;
			await Auth.removeServerFromUserCache({
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
		} catch (error) {
			console.error('Error in UpdateUserServerCacheOnRemove:', error);
		}
	}
}

@ApplyOptions<Listener.Options>({
	event: Events.UserUpdate,
	name: 'UpdateUserServerCacheOnUpdate',
})
export class SyncOnUpdate extends Listener {
	public async run(_: User, newUser: User) {
		try {
			const account = await Auth.findDiscordOauthByProviderAccountId(
				newUser.id,
			);
			if (!account || !account.access_token) return;
			await Auth.updateCachedDiscordUser(account.access_token, {
				...account,
				avatar: newUser.avatar,
				username: newUser.displayName,
				discriminator: newUser.discriminator,
			});
		} catch (error) {
			console.error('Error in UpdateUserServerCacheOnUpdate:', error);
		}
	}
}
