import type { DiscordAccount, Server } from "@answeroverflow/prisma-types";
import { mockDiscordAccount, mockServer } from "@answeroverflow/db-mock";
import { addFlagsToUserServerSettings } from "./zod-schemas";
import { createServer } from "./server";
import { createDiscordAccount } from "./discord-account";
import {
  createUserServerSettings,
  findUserServerSettingsById,
  updateUserServerSettings,
  UserServerSettingsWithFlags,
} from "./user-server-settings";

let server: Server;
let account: DiscordAccount;
beforeEach(async () => {
  server = mockServer();
  await createServer(server);
  account = mockDiscordAccount();
  await createDiscordAccount(account);
});

describe("User Server Settings", () => {
  describe("Add Flags To User Server Settings", () => {
    it("should add flags to User Server settings", () => {
      const data = addFlagsToUserServerSettings({
        bitfield: 0,
        server_id: "server_id",
        user_id: "user_id",
      });
      expect(data.flags.can_publicly_display_messages).toBe(false);
      expect(data.flags.message_indexing_disabled).toBe(false);
    });
  });
  describe("Create User Server Settings", () => {
    it("should create user server settings with consent enabled", async () => {
      // setup
      const created = await createUserServerSettings({
        server_id: server.id,
        user_id: account.id,
        flags: {
          can_publicly_display_messages: true,
        },
      });
      expect(created.flags.can_publicly_display_messages).toBe(true);
      const found = await findUserServerSettingsById({
        server_id: server.id,
        user_id: account.id,
      });
      expect(found!.flags.can_publicly_display_messages).toBe(true);
    });
  });
  describe("Update User Server Settings", () => {
    let existing: UserServerSettingsWithFlags;
    beforeEach(async () => {
      existing = await createUserServerSettings({
        server_id: server.id,
        user_id: account.id,
      });
    });
    it("should update user server settings with consent enabled", async () => {
      const updated = await updateUserServerSettings(
        {
          server_id: server.id,
          user_id: account.id,
          flags: {
            can_publicly_display_messages: true,
          },
        },
        existing
      );
      expect(updated.flags.can_publicly_display_messages).toBe(true);
      const found = await findUserServerSettingsById({
        server_id: server.id,
        user_id: account.id,
      });
      expect(found!.flags.can_publicly_display_messages).toBe(true);
    });
  });
});
