import { Events } from "discord.js";
import { createNormalScenario } from "~discord-bot/test/utils/discordjs/scenarios";

describe("Message Parity Tests", () => {
  it("should delete a message from elastic", async () => {
    const { client, text_channel_message_from_default } = await createNormalScenario();
    const message_delete_listener = client.stores
      .get("listeners")
      .find((listener) => listener.name === "Message Delete Watcher")!;
    jest.spyOn(message_delete_listener, "run");
    client.emit(Events.MessageDelete, text_channel_message_from_default);
    expect(message_delete_listener.run).toHaveBeenCalledTimes(1);
  });
});
