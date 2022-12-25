import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Message, Events, Collection, Snowflake } from "discord.js";
import { toAOMessage } from "~discord-bot/utils/conversions";
import { callAPI } from "~discord-bot/utils/trpc";

@ApplyOptions<Listener.Options>({ event: Events.MessageDelete, name: "Message Delete Watcher" })
export class OnMessage extends Listener {
  public async run(message: Message) {
    await callAPI({
      ApiCall(router) {
        return router.messages.delete(message.id);
      },
      Ok(result) {
        console.log("Deleted message:", result);
      },
      Error(error) {
        console.error("Error deleting message:", error);
      },
    });
  }
}

@ApplyOptions<Listener.Options>({
  event: Events.MessageBulkDelete,
  name: "Message Delete Bulk Watcher",
})
export class OnMessageBulkDelete extends Listener {
  public async run(messages: Collection<Snowflake, Message>) {
    await callAPI({
      async ApiCall(router) {
        return router.messages.deleteBulk(messages.map((message) => message.id));
      },
      Ok(result) {
        console.log("Bulk deleted messages:", result);
      },
      Error(error) {
        console.error("Error bulk deleting messages:", error);
      },
    });
  }
}

@ApplyOptions<Listener.Options>({ event: Events.MessageUpdate, name: "Message Update Watcher" })
export class OnMessageUpdate extends Listener {
  public async run(_old_message: Message, new_message: Message) {
    await callAPI({
      async ApiCall(router) {
        return router.messages.update(toAOMessage(new_message));
      },
      Ok(result) {
        console.log("Updated message:", result);
      },
      Error(error) {
        console.error("Error updating message:", error);
      },
    });
  }
}
