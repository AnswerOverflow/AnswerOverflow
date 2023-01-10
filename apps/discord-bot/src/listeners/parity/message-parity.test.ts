import { Collection, Events, Message, TextChannel } from "discord.js";
import { setupBot } from "~discord-bot/test/utils/discordjs/scenarios";
import { copyClass, emitEvent } from "~discord-bot/test/utils/helpers";
import { elastic } from "@answeroverflow/db";
import type { SapphireClient } from "@sapphire/framework";
import { toAOMessage } from "~discord-bot/utils/conversions";
import { mockMessage, mockTextChannel } from "~discord-bot/test/utils/discordjs/channel-mock";

let client: SapphireClient;
let message: Message;
let text_channel: TextChannel;
let data: Awaited<ReturnType<typeof setupBot>>;
beforeEach(async () => {
  data = await setupBot();
  client = data.client;
  text_channel = mockTextChannel(client);
  message = mockMessage(client, undefined, text_channel);
});

describe("Message Delete Tests", () => {
  it("should deleted a cached message", async () => {
    await elastic.upsertMessage(toAOMessage(message));
    await emitEvent(client, Events.MessageDelete, message);
    const deleted_msg = await elastic.getMessage(message.id);
    expect(deleted_msg).toBeNull();
  });
  test.todo("should delete an uncached message");
});

describe("Message Update Tests", () => {
  it("should update a cached edited message", async () => {
    const updated_message = copyClass(message, client, {
      content: "updated",
    });
    await elastic.upsertMessage(toAOMessage(message));
    await emitEvent(client, Events.MessageUpdate, message, updated_message);
    const updated = await elastic.getMessage(message.id);
    expect(updated!.content).toBe("updated");
  });
  test.todo("should update an uncached edited message");
});

describe("Message Bulk Delete Tests", () => {
  it("should deleted cached bulk messages", async () => {
    await elastic.upsertMessage(toAOMessage(message));

    await emitEvent(
      client,
      Events.MessageBulkDelete,
      new Collection([[message.id, message]]),
      text_channel
    );

    const deleted_msg = await elastic.getMessage(message.id);
    expect(deleted_msg).toBeNull();
  });
  test.todo("should delete an uncached bulk messages");
});
