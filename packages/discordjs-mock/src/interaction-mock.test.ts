import { Events } from "discord.js";
import { emitEvent } from "./helpers";
import { mockInteracion } from "./interaction-mock";
import { setupBot } from "./client-mock";

describe("Interaction Mock", () => {
  it("should create a mocked interaction", async () => {
    const client = await setupBot();
    const interaction = mockInteracion(client, "test", "1");
    await emitEvent(client, Events.InteractionCreate, interaction);
  });
});
