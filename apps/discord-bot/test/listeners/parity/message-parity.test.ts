import { Collection, Events, Message } from "discord.js";
import { createNormalScenario } from "~discord-bot/test/utils/discordjs/scenarios";
import { delay } from "~discord-bot/test/utils/helpers";
import { elastic, getDefaultMessage } from "@answeroverflow/db";
import type { Message as AOMessage } from "@answeroverflow/db";
import type { Listener, SapphireClient } from "@sapphire/framework";

let client: SapphireClient;
let text_channel_message_from_default: Message;
let data: Awaited<ReturnType<typeof createNormalScenario>>;
beforeEach(async () => {
  data = await createNormalScenario();
  client = data.client;
  text_channel_message_from_default = data.text_channel_message_from_default;
});

describe("Message Delete Tests", () => {
  let message_delete_listener: Listener;
  beforeEach(() => {
    message_delete_listener = client.stores
      .get("listeners")
      .find((listener) => listener.name === "Message Delete Watcher")!;
    expect(message_delete_listener).toBeDefined();
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/require-await
    elastic.deleteMessage = jest.fn(async (_message_id: string) => true);
  });
  it("should deleted a cached message", async () => {
    jest.spyOn(message_delete_listener, "run");
    client.emit(Events.MessageDelete, text_channel_message_from_default);
    await delay();

    const deleted_msg = await elastic.getMessage(text_channel_message_from_default.id);
    expect(deleted_msg).toBeNull();
    expect(message_delete_listener.run).toHaveBeenCalledTimes(1);
    expect(elastic.deleteMessage).toHaveBeenCalledTimes(1);
  });
  test.todo("should delete an uncached message");
});

describe("Message Update Tests", () => {
  let message_update_listener: Listener;
  beforeEach(() => {
    message_update_listener = client.stores
      .get("listeners")
      .find((listener) => listener.name === "Message Update Watcher")!;
    // eslint-disable-next-line @typescript-eslint/require-await
    elastic.getMessage = jest.fn(async (message_id: string) =>
      getDefaultMessage(
        message_id,
        data.guild_member_default.id,
        data.text_channel.id,
        data.guild.id
      )
    );
    // eslint-disable-next-line @typescript-eslint/require-await
    elastic.indexMessage = jest.fn(async (message: AOMessage) => message);
  });
  it("should update a cached edited message", async () => {
    jest.spyOn(message_update_listener, "run");
    client.emit(
      Events.MessageUpdate,
      text_channel_message_from_default,
      text_channel_message_from_default
    );
    await delay();
    expect(message_update_listener.run).toHaveBeenCalledTimes(1);
    expect(elastic.indexMessage).toHaveBeenCalledTimes(1);
  });
  test.todo("should update an uncached edited message");
});

describe("Message Bulk Delete Tests", () => {
  let message_delete_bulk_listener: Listener;
  beforeEach(() => {
    message_delete_bulk_listener = client.stores
      .get("listeners")
      .find((listener) => listener.name === "Message Delete Bulk Watcher")!;
    expect(message_delete_bulk_listener).toBeDefined();
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/require-await
    elastic.bulkDeleteMessages = jest.fn(async (_message_ids: string[]) => true);
  });
  it("should deleted cached bulk messages", async () => {
    jest.spyOn(message_delete_bulk_listener, "run");
    client.emit(
      Events.MessageBulkDelete,
      new Collection([[text_channel_message_from_default.id, text_channel_message_from_default]]),
      data.text_channel
    );
    await delay();
    expect(message_delete_bulk_listener.run).toHaveBeenCalledTimes(1);
    expect(elastic.bulkDeleteMessages).toHaveBeenCalledTimes(1);
  });
  test.todo("should delete an uncached bulk messages");
});
