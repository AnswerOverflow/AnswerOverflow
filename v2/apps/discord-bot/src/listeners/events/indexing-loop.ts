import { ApplyOptions } from "@sapphire/decorators";
import { Listener, Events } from "@sapphire/framework";
import { Client } from "discord.js";
import { indexServers } from "../../domains/indexing";
import { CronJob } from "cron";
import { botEnv } from "@answeroverflow/env/bot";

@ApplyOptions<Listener.Options>({
  once: true,
  event: Events.ClientReady,
  name: "indexing-timer",
})
export class Indexing extends Listener {
  public async run(client: Client) {
    if (botEnv.INDEXING_DISABLED) {
      return;
    }
    CronJob.from({
      // every 6 hours
      cronTime: "0 */6 * * *",
      onTick: async () => {
        await indexServers(client);
      },
      start: true,
      timeZone: "America/Los_Angeles",
    });
    if (botEnv.NODE_ENV !== "production") {
      await indexServers(client);
    }
  }
}
