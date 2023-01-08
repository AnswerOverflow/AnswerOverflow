import { Collection, Events, Message } from "discord.js";
import { createNormalScenario } from "~discord-bot/test/utils/discordjs/scenarios";
import { copyClass, emitEvent } from "~discord-bot/test/utils/helpers";
import { elastic } from "@answeroverflow/db";
import type { SapphireClient } from "@sapphire/framework";
import { toAOMessage } from "~discord-bot/utils/conversions";

let client: SapphireClient;
let text_channel_message_from_default: Message;
let data: Awaited<ReturnType<typeof createNormalScenario>>;
beforeEach(async () => {
  data = await createNormalScenario();
  client = data.client;
  text_channel_message_from_default = data.text_channel_message_from_default;
});

describe("Message Delete Tests", () => {
  it("should deleted a cached message", async () => {
    await elastic.upsertMessage(toAOMessage(text_channel_message_from_default));
    await emitEvent(client, Events.MessageDelete, text_channel_message_from_default);
    const deleted_msg = await elastic.getMessage(text_channel_message_from_default.id);
    expect(deleted_msg).toBeNull();
  });
  test.todo("should delete an uncached message");
});

describe("Message Update Tests", () => {
  it("should update a cached edited message", async () => {
    const updated_message = copyClass(text_channel_message_from_default, client, {
      content: "updated",
    });
    await elastic.upsertMessage(toAOMessage(text_channel_message_from_default));
    await emitEvent(
      client,
      Events.MessageUpdate,
      text_channel_message_from_default,
      updated_message
    );
    const updated = await elastic.getMessage(text_channel_message_from_default.id);
    expect(updated!.content).toBe("updated");
  });
  test.todo("should update an uncached edited message");
});

describe("Message Bulk Delete Tests", () => {
  it("should deleted cached bulk messages", async () => {
    await elastic.upsertMessage(toAOMessage(text_channel_message_from_default));

    await emitEvent(
      client,
      Events.MessageBulkDelete,
      new Collection([[text_channel_message_from_default.id, text_channel_message_from_default]]),
      data.text_channel
    );

    const deleted_msg = await elastic.getMessage(text_channel_message_from_default.id);
    expect(deleted_msg).toBeNull();
  });
  test.todo("should delete an uncached bulk messages");
});
