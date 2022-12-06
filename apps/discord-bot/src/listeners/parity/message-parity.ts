import { Listener } from "@sapphire/framework";
import type { Message } from "discord.js";

export class SyncMessageDelete extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "messageDelete",
      name: "MessageDeletedWatcher",
    });
  }

  public run(message: Message) {
    console.log("Deleting message: ", message.id);
  }
}
