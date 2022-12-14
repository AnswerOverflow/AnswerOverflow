import type { SapphireClient } from "@sapphire/framework";
import { Events, Interaction } from "discord.js";
import { mockInteracion } from "./interaction-mock";
import { mockClient } from "./mock";

export async function runMockInteraction(
  client: SapphireClient,
  interaction: Interaction
): Promise<Interaction> {
  let received_interaction: Interaction | undefined;
  client.addListener(Events.InteractionCreate, (interaction: Interaction) => {
    received_interaction = interaction;
  });
  client.emit(Events.InteractionCreate, interaction);
  while (!received_interaction) {
    await new Promise((resolve) => setTimeout(resolve, 100)); // TODO: This is ugly
  }
  return received_interaction;
}

describe("Interaction Mock", () => {
  it("should create a mocked interaction", async () => {
    const client = mockClient();
    await client.login("test");
    const interaction = mockInteracion(client, "test", "1");
    const received_interaction = await runMockInteraction(client, interaction);
    expect(received_interaction).toBe(interaction);
    expect(received_interaction.id).toBe(interaction.id);
    expect(received_interaction.type).toBe(interaction.type);
    expect(received_interaction.isChatInputCommand()).toBeTruthy();
  });
});
