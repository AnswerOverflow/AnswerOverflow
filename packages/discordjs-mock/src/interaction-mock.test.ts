import { Events } from "discord.js";
import { emitEvent } from "./helpers";
import { mockButtonInteraction, mockChatInputCommandInteraction } from "./interaction-mock";
import { setupBot } from "./client-mock";

describe("Interaction Mock", () => {
  it("should create a mocked interaction", async () => {
    const client = await setupBot();
    const interaction = mockChatInputCommandInteraction(client, "test", "1");
    await emitEvent(client, Events.InteractionCreate, interaction);
  });
  describe("Button Interaction", () => {
    it("should create a mocked button interaction", async () => {
      const client = await setupBot();
      const expectedId = "test";
      const interaction = mockButtonInteraction({
        client,
        override: {
          custom_id: expectedId,
        },
      });
      client.on(Events.InteractionCreate, async (interaction) => {
        if (interaction.isButton()) {
          await interaction.update({
            content: "test",
          });
        }
      });
      await emitEvent(client, Events.InteractionCreate, interaction);
      expect(interaction.message.content).toBe("test");
    });
  });
});
