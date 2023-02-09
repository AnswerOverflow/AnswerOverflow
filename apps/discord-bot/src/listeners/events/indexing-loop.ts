import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Client, Events } from "discord.js";
import { container } from "@sapphire/framework";
import { indexServers } from "~discord-bot/domains/indexing";

@ApplyOptions<Listener.Options>({ once: true, event: Events.ClientReady })
export class Indexing extends Listener {
  public async run(client: Client) {
    const intervalInHours = process.env.INDEXING_INTERVAL_IN_HOURS
      ? parseFloat(process.env.INDEXING_INTERVAL_IN_HOURS)
      : 24;
    container.logger.info(`Indexing all servers every ${intervalInHours} hours`);
    const intervalInMs = intervalInHours * 60 * 60 * 1000;
    await indexServers(client); // Do an initial index before the loop kicks in
    setInterval(() => {
      void indexServers(client);
    }, intervalInMs);
  }
}
