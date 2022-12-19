import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Message, Events } from "discord.js";
import { callAPI } from "~discord-bot/utils/trpc";

@ApplyOptions<Listener.Options>({ event: Events.MessageDelete, name: "Message Delete Watcher" })
export class OnMessage extends Listener {
  public async run(message: Message) {
    console.log("Deleting message: ", message.id);
    await callAPI({
      ApiCall(router) {
        return router.deleteMessage(message.id);
      },
      Ok(result) {
        console.log("Deleted message: ", result);
      },
      Error(error) {
        console.error("Error deleting message: ", error);
      },
    });
  }
}
