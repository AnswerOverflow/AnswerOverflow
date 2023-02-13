import type { Client } from "discord.js";
import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import { testUpdateUserServerSettings } from "~discord-bot/test/utils";
import { updateUserServerIndexingEnabled } from "./manage-account";

const sources = ["manage-account-menu"];

let client: Client;
beforeEach(async () => {
  client = await setupAnswerOverflowBot();
});

describe("Manage Account", () => {
  it("should disable message indexing for a user", async () => {
    await testUpdateUserServerSettings({
      client,
      operation: (data) => {
        return updateUserServerIndexingEnabled({
          ...data,
          messageIndexingDisabled: true,
        });
      },
      sources,
      startingSettings: null,
      validate: ({ updated }) => {
        expect(updated?.flags.messageIndexingDisabled).toBe(true);
      },
    });
  });
  it("should enable message indexing for a user", async () => {
    await testUpdateUserServerSettings({
      client,
      operation: (data) => {
        return updateUserServerIndexingEnabled({
          ...data,
          messageIndexingDisabled: false,
        });
      },
      sources,
      startingSettings: {
        flags: {
          messageIndexingDisabled: true,
        },
      },
      validate: ({ updated }) => {
        expect(updated?.flags.messageIndexingDisabled).toBe(false);
      },
    });
  });
  it("should disable message indexing for a user and update their consent to no longer display messages", async () => {
    await testUpdateUserServerSettings({
      client,
      operation: (data) => {
        return updateUserServerIndexingEnabled({
          ...data,
          messageIndexingDisabled: true,
        });
      },
      sources,
      startingSettings: {
        flags: {
          canPubliclyDisplayMessages: true,
        },
      },
      validate: ({ updated }) => {
        expect(updated?.flags.messageIndexingDisabled).toBe(true);
        expect(updated?.flags.canPubliclyDisplayMessages).toBe(false);
      },
    });
  });
});
