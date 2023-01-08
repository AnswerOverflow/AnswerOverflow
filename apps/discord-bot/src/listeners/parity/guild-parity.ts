import { ALLOWED_CHANNEL_TYPES } from "@answeroverflow/api";
import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Events, Guild } from "discord.js";
import { createAnswerOveflowBotCtx } from "~discord-bot/utils/context";
import { toAOChannel, toAOServer } from "~discord-bot/utils/conversions";
import { callApiWithConsoleStatusHandler } from "~discord-bot/utils/trpc";

/*
  Guild relevated events are tracked here, this may make sense to split into multiple files as the complexity grows.
*/

@ApplyOptions<Listener.Options>({ once: true, event: "ready" })
export class SyncOnReady extends Listener {
  public async run() {
    // 1. Sync all of the servers to have the most up to date data
    // 2. For any servers that are in the database and not in the guilds the bot is in, mark them as kicked
  }
}
@ApplyOptions<Listener.Options>({ event: Events.GuildCreate, name: "Guild Sync On Join" })
export class SyncOnJoin extends Listener {
  public async run(guild: Guild) {
    await callApiWithConsoleStatusHandler({
      async ApiCall(router) {
        await router.servers.upsert(toAOServer(guild));
        await router.channels.upsertMany(
          guild.channels.cache
            .filter((channel) => ALLOWED_CHANNEL_TYPES.has(channel.type))
            .map((channel) => toAOChannel(channel))
        );
      },
      error_message: `Error syncing server: ${guild.id}`,
      success_message: `Synced server: ${guild.id}`,
      getCtx: createAnswerOveflowBotCtx,
    });
  }
}

/*
 * On delete, we want to mark the server as kicked, but we don't want to delete it from the database.
 * This is incase someone is just temporarily kicking the bot, and we don't want to lose all of the data.
 * A background job will periodically clean up servers that have been kicked for a long time.
 */
@ApplyOptions<Listener.Options>({ event: Events.GuildDelete, name: "Guild Sync On Delete" })
export class SyncOnDelete extends Listener {
  public async run(guild: Guild) {
    await callApiWithConsoleStatusHandler({
      async ApiCall(router) {
        return await router.servers.upsert({
          ...toAOServer(guild),
          kicked_time: new Date(),
        });
      },
      error_message: `Error syncing delete server: ${guild.id}`,
      success_message: `Synced kicked from server: ${guild.id}`,
      getCtx: createAnswerOveflowBotCtx,
    });
  }
}

@ApplyOptions<Listener.Options>({ event: Events.GuildUpdate, name: "Guild Sync On Update" })
export class SyncOnUpdate extends Listener {
  public async run(_oldGuild: Guild, newGuild: Guild) {
    await callApiWithConsoleStatusHandler({
      async ApiCall(router) {
        return await router.servers.upsert(toAOServer(newGuild));
      },
      error_message: `Error syncing update server: ${newGuild.id}`,
      success_message: `Synced update to server: ${newGuild.id}`,
      getCtx: createAnswerOveflowBotCtx,
    });
  }
}
