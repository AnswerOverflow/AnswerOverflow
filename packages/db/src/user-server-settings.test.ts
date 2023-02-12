import type {
  DiscordAccount,
  Server,
  UserServerSettingsWithFlags,
} from "@answeroverflow/prisma-types";
import { mockDiscordAccount, mockServer } from "@answeroverflow/db-mock";
import { addFlagsToUserServerSettings } from "@answeroverflow/prisma-types";
import { createServer } from "./server";
import { createDiscordAccount } from "./discord-account";
import {
  createUserServerSettings,
  findUserServerSettingsById,
  updateUserServerSettings,
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
        serverId: "serverId",
        userId: "userId",
      });
      expect(data.flags.canPubliclyDisplayMessages).toBe(false);
      expect(data.flags.messageIndexingDisabled).toBe(false);
    });
  });
  describe("Create User Server Settings", () => {
    it("should create user server settings with consent enabled", async () => {
      // setup
      const created = await createUserServerSettings({
        serverId: server.id,
        userId: account.id,
        flags: {
          canPubliclyDisplayMessages: true,
        },
      });
      expect(created.flags.canPubliclyDisplayMessages).toBe(true);
      const found = await findUserServerSettingsById({
        serverId: server.id,
        userId: account.id,
      });
      expect(found!.flags.canPubliclyDisplayMessages).toBe(true);
    });
  });
  describe("Update User Server Settings", () => {
    let existing: UserServerSettingsWithFlags;
    beforeEach(async () => {
      existing = await createUserServerSettings({
        serverId: server.id,
        userId: account.id,
      });
    });
    it("should update user server settings with consent enabled", async () => {
      const updated = await updateUserServerSettings(
        {
          serverId: server.id,
          userId: account.id,
          flags: {
            canPubliclyDisplayMessages: true,
          },
        },
        existing
      );
      expect(updated.flags.canPubliclyDisplayMessages).toBe(true);
      const found = await findUserServerSettingsById({
        serverId: server.id,
        userId: account.id,
      });
      expect(found!.flags.canPubliclyDisplayMessages).toBe(true);
    });
  });
});
