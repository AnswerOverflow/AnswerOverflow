import { Events } from "discord.js";
import { emitEvent } from "../helpers";
import { mockInteracion } from "./interaction-mock";
import { mockClient } from "./mock";

describe("Interaction Mock", () => {
  it("should create a mocked interaction", async () => {
    const client = mockClient();
    await client.login("test");
    const interaction = mockInteracion(client, "test", "1");
    await emitEvent(client, Events.InteractionCreate, interaction);
  });
});
