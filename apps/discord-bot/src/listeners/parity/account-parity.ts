import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Events, GuildMember } from "discord.js";
import { addServerToUserServerCache, removeServerFromUserCache } from "@answeroverflow/cache";
import { findDiscordOauthById } from "@answeroverflow/db";
import { toDiscordAPIServer } from "~discord-bot/utils/conversions";

@ApplyOptions<Listener.Options>({
  event: Events.GuildMemberAdd,
  name: "UpdateUserServerCacheOnAdd",
})
export class SyncOnAdd extends Listener {
  public async run(member: GuildMember) {
    const account = await findDiscordOauthById(member.user.id);
    if (!account || !account.access_token) return;
    await addServerToUserServerCache({
      accessToken: account.access_token,
      server: toDiscordAPIServer(member),
    });
  }
}

@ApplyOptions<Listener.Options>({
  event: Events.GuildMemberRemove,
  name: "UpdateUserServerCacheOnRemove",
})
export class SyncOnRemove extends Listener {
  public async run(member: GuildMember) {
    const account = await findDiscordOauthById(member.user.id);
    if (!account || !account.access_token) return;
    const guild = member.guild;
    await removeServerFromUserCache({
      accessToken: account.access_token,
      serverId: guild.id,
    });
  }
}
