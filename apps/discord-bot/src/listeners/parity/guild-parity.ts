/* eslint-disable no-unused-vars */
import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import type { Guild } from "discord.js";

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

@ApplyOptions<Listener.Options>({ event: "guildCreate" })
export class SyncOnJoin extends Listener {
  public async run(guild: Guild) {
    // Call syncServer with the guild
  }
}

@ApplyOptions<Listener.Options>({ event: "guildDelete" })
export class SyncOnDelete extends Listener {
  public async run(guild: Guild) {
    // Mark the server as kicked
  }
}
