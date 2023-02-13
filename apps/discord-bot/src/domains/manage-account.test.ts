import type { Client } from "discord.js";
import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";

let client: Client;
beforeEach(async () => {
  client = await setupAnswerOverflowBot();
});

describe("Manage Account", () => {
  it("should disable message indexing for a user", async () => {});
  it("should enable message indexing for a user", async () => {});
  it("should disable message indexing for a user and update their consent to no longer display messages", async () => {});
});
