import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import type { Channel, Collection, Message, Snowflake } from "discord.js";

@ApplyOptions<Listener.Options>({ event: "messageDelete" })
export class SyncMessageDelete extends Listener {
  public async run(message: Message) {
    console.log("Deleting message: ", message.id);
  }
}

@ApplyOptions<Listener.Options>({ event: "messageDeleteBulk" })
export class SyncBulkMessageDelete extends Listener {
  public async run(messages: Collection<Snowflake, Message>, channel: Channel) {
    console.log("Bulk deleting messages in channel ", messages.size, channel.id);
  }
}
