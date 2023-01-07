import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Message, Events, Collection, Snowflake } from "discord.js";
import { createAnswerOveflowBotCtx } from "~discord-bot/utils/context";
import { toAOMessage } from "~discord-bot/utils/conversions";
import { callApiWithConsoleStatusHandler } from "~discord-bot/utils/trpc";

@ApplyOptions<Listener.Options>({ event: Events.MessageDelete, name: "Message Delete Watcher" })
export class OnMessage extends Listener {
  public async run(message: Message) {
    await callApiWithConsoleStatusHandler({
      ApiCall(router) {
        return router.messages.delete(message.id);
      },
      console_error_message: `Error deleting message: ${message.id}`,
      console_success_message: `Deleted message: ${message.id}`,
      getCtx: createAnswerOveflowBotCtx,
    });
  }
}

@ApplyOptions<Listener.Options>({
  event: Events.MessageBulkDelete,
  name: "Message Delete Bulk Watcher",
})
export class OnMessageBulkDelete extends Listener {
  public async run(messages: Collection<Snowflake, Message>) {
    await callApiWithConsoleStatusHandler({
      async ApiCall(router) {
        return router.messages.deleteBulk(messages.map((message) => message.id));
      },
      console_error_message: `Error deleting messages: ${messages
        .map((message) => message.id)
        .join(", ")}`,
      console_success_message: `Deleted messages: ${messages
        .map((message) => message.id)
        .join(", ")}`,
      getCtx: createAnswerOveflowBotCtx,
    });
  }
}

@ApplyOptions<Listener.Options>({ event: Events.MessageUpdate, name: "Message Update Watcher" })
export class OnMessageUpdate extends Listener {
  public async run(_old_message: Message, new_message: Message) {
    await callApiWithConsoleStatusHandler({
      async ApiCall(router) {
        return router.messages.update(toAOMessage(new_message));
      },
      console_error_message: `Error updating message: ${new_message.id}`,
      console_success_message: `Updated message: ${new_message.id}`,
      getCtx: createAnswerOveflowBotCtx,
    });
  }
}
