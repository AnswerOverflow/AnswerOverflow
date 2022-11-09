import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { syncServer } from "../utils/sync-server";

@ApplyOptions<Listener.Options>({ once: true, event: "ready" })
export class SyncOnReady extends Listener {
  public run() {
    this.container.client.guilds.cache.forEach(async (guild) => {
      syncServer(guild);
    }, this);
  }
}
