import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Message, Events, Collection, Snowflake } from "discord.js";
import {
  callDatabaseWithErrorHandler,
  deleteManyMessages,
  deleteMessage,
  updateMessage,
} from "@answeroverflow/db";
import { toAOMessage } from "~discord-bot/utils/conversions";

@ApplyOptions<Listener.Options>({ event: Events.MessageDelete, name: "Message Delete Watcher" })
export class OnMessageDelete extends Listener {
  public async run(message: Message) {
    await callDatabaseWithErrorHandler({
      operation: () => deleteMessage(message.id),
      allowed_errors: ["NOT_FOUND"],
    });
  }
}

@ApplyOptions<Listener.Options>({
  event: Events.MessageBulkDelete,
  name: "Message Delete Bulk Watcher",
})
export class OnMessageBulkDelete extends Listener {
  public async run(messages: Collection<Snowflake, Message>) {
    await callDatabaseWithErrorHandler({
      operation: () => {
        return deleteManyMessages(messages.map((message) => message.id));
      },
      allowed_errors: ["NOT_FOUND"],
    });
  }
}

@ApplyOptions<Listener.Options>({ event: Events.MessageUpdate, name: "Message Update Watcher" })
export class OnMessageUpdate extends Listener {
  public async run(_old_message: Message, new_message: Message) {
    await callDatabaseWithErrorHandler({
      operation: () => updateMessage(toAOMessage(new_message)),
      allowed_errors: ["NOT_FOUND"],
    });
  }
}
