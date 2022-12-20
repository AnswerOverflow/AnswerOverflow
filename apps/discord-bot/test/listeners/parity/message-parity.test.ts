import { Collection, Events } from "discord.js";
import { createNormalScenario } from "~discord-bot/test/utils/discordjs/scenarios";
import { delay } from "~discord-bot/test/utils/helpers";

describe("Message Parity Tests", () => {
  it("should deleted a cached message", async () => {
    const { client, text_channel_message_from_default } = await createNormalScenario();
    const message_delete_listener = client.stores
      .get("listeners")
      .find((listener) => listener.name === "Message Delete Watcher")!;

    jest.spyOn(message_delete_listener, "run");
    client.emit(Events.MessageDelete, text_channel_message_from_default);
    await delay();
    expect(message_delete_listener.run).toHaveBeenCalledTimes(1);
  });
  test.todo("should delete an uncached message");
  test.todo("should update a cached edited message");
  test.todo("should update an uncached edited message");
  it("should deleted bulk messages", async () => {
    const { client, text_channel_message_from_default, text_channel } =
      await createNormalScenario();
    const message_delete_bulk_listener = client.stores
      .get("listeners")
      .find((listener) => listener.name === "Message Delete Bulk Watcher")!;

    jest.spyOn(message_delete_bulk_listener, "run");
    client.emit(
      Events.MessageBulkDelete,
      new Collection([[text_channel_message_from_default.id, text_channel_message_from_default]]),
      text_channel
    );
    await delay();
    expect(message_delete_bulk_listener.run).toHaveBeenCalledTimes(1);
  });
});
