import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { discordGuildToPrismaServer } from "@utils/conversion";
import { syncServer } from "@utils/sync-server";
import type { Guild } from "discord.js";

/*
  Guild relevated events are tracked here, this may make sense to split into multiple files as the complexity grows.
*/

@ApplyOptions<Listener.Options>({ once: true, event: "ready" })
export class SyncOnReady extends Listener {
  public async run() {
    // 1. Sync all of the servers to have the most up to date data
    const syncServerTasks = this.container.client.guilds.cache.map(async (guild) => {
      syncServer(guild);
    }, this);
    await Promise.all(syncServerTasks);

    // 2. For any servers that are in the database and not in the guilds the bot is in, mark them as kicked
    const all_servers = await this.container.answer_overflow.servers.getServers({});
    const active_server_lookup = new Set(
      this.container.client.guilds.cache.map((guild) => guild.id)
    );
    const markAsKickedTasks = all_servers.map(async (server) => {
      if (!active_server_lookup.has(server.id)) {
        this.container.answer_overflow.servers.markServerAsKicked(server);
      }
    });
    await Promise.all(markAsKickedTasks);
  }
}

@ApplyOptions<Listener.Options>({ event: "guildCreate" })
export class SyncOnJoin extends Listener {
  public async run(guild: Guild) {
    await syncServer(guild);
  }
}

@ApplyOptions<Listener.Options>({ event: "guildDelete" })
export class SyncOnDelete extends Listener {
  public async run(guild: Guild) {
    const converted_server = discordGuildToPrismaServer(guild);
    await this.container.answer_overflow.servers.markServerAsKicked(converted_server);
  }
}
