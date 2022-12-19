import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Message, Events } from "discord.js";

@ApplyOptions<Listener.Options>({ event: Events.MessageDelete, name: "Message Delete Watcher" })
export class OnMessage extends Listener {
  public run(message: Message) {
    console.log("Deleting message: ", message.id);
  }
}
