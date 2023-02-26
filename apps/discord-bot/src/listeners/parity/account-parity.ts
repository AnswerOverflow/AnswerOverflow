import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Events } from "discord.js";

@ApplyOptions<Listener.Options>({ event: Events.GuildMemberAdd })
export class SyncOnReady extends Listener {
  public async run() {}
}
