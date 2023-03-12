import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Events, GuildMember, User } from "discord.js";
import {
	addServerToUserServerCache,
	removeServerFromUserCache,
	updateCachedDiscordUser
} from "@answeroverflow/cache";
import { findDiscordOauthByProviderAccountId } from "@answeroverflow/db";
import { toDiscordAPIServer } from "~discord-bot/utils/conversions";

@ApplyOptions<Listener.Options>({
	event: Events.GuildMemberAdd,
	name: "UpdateUserServerCacheOnAdd"
})
export class SyncOnAdd extends Listener {
	public async run(member: GuildMember) {
		const account = await findDiscordOauthByProviderAccountId(member.user.id);
		if (!account || !account.access_token) return;
		await addServerToUserServerCache({
			accessToken: account.access_token,
			server: toDiscordAPIServer(member)
		});
	}
}

@ApplyOptions<Listener.Options>({
	event: Events.GuildMemberRemove,
	name: "UpdateUserServerCacheOnRemove"
})
export class SyncOnRemove extends Listener {
	public async run(member: GuildMember) {
		const account = await findDiscordOauthByProviderAccountId(member.user.id);
		if (!account || !account.access_token) return;
		const guild = member.guild;
		await removeServerFromUserCache({
			accessToken: account.access_token,
			serverId: guild.id
		});
	}
}

@ApplyOptions<Listener.Options>({
	event: Events.UserUpdate,
	name: "UpdateUserServerCacheOnUpdate"
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
			discriminator: newUser.discriminator
		});
	}
}
