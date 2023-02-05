import { Collection, Events, Message, TextChannel } from "discord.js";
import type { SapphireClient } from "@sapphire/framework";
import { toAOMessage } from "~discord-bot/utils/conversions";
import { mockTextChannel, mockMessage, emitEvent, copyClass } from "@answeroverflow/discordjs-mock";
import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import { testOnlyAPICall } from "~discord-bot/test/helpers";

let client: SapphireClient;
let message: Message;
let text_channel: TextChannel;

beforeEach(async () => {
  client = await setupAnswerOverflowBot();
  text_channel = mockTextChannel(client);
  message = mockMessage({ client, channel: text_channel });
});

describe("Message Delete Tests", () => {
  it("should deleted a cached message", async () => {
    await testOnlyAPICall((router) => router.messages.upsert(toAOMessage(message)));
    await emitEvent(client, Events.MessageDelete, message);
    const deleted_msg = await testOnlyAPICall((router) => router.messages.byId(message.id));
    expect(deleted_msg).toBeNull();
  });
  test.todo("should delete an uncached message");
});

describe("Message Update Tests", () => {
  it("should update a cached edited message", async () => {
    const updated_message = copyClass(message, client, {
      content: "updated",
    });
    await testOnlyAPICall((router) => router.messages.upsert(toAOMessage(message)));
    await emitEvent(client, Events.MessageUpdate, message, updated_message);
    const updated = await testOnlyAPICall((router) => router.messages.byId(message.id));
    expect(updated!.content).toBe("updated");
  });
  test.todo("should update an uncached edited message");
});

describe("Message Bulk Delete Tests", () => {
  it("should deleted cached bulk messages", async () => {
    await testOnlyAPICall((router) => router.messages.upsert(toAOMessage(message)));

    await emitEvent(
      client,
      Events.MessageBulkDelete,
      new Collection([[message.id, message]]),
      text_channel
    );

    const deleted_msg = await testOnlyAPICall((router) => router.messages.byId(message.id));
    expect(deleted_msg).toBeNull();
  });
  test.todo("should delete an uncached bulk messages");
});
