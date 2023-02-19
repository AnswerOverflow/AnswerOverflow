import type {
  DiscordAccount,
  Server,
  UserServerSettingsWithFlags,
} from "@answeroverflow/prisma-types";
import { mockChannel, mockDiscordAccount, mockMessage, mockServer } from "@answeroverflow/db-mock";
import { addFlagsToUserServerSettings } from "@answeroverflow/prisma-types";
import { createServer } from "./server";
import { createDiscordAccount } from "./discord-account";
import {
  CANNOT_GRANT_CONSENT_TO_PUBLICLY_DISPLAY_MESSAGES_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE,
  createUserServerSettings,
  findUserServerSettingsById,
  updateUserServerSettings,
} from "./user-server-settings";
import { findMessageById, upsertMessage } from "./message";
import { createChannel } from "./channel";

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
    it("should disable consent when setting message indexing to false", async () => {
      await updateUserServerSettings(
        {
          serverId: server.id,
          userId: account.id,
          flags: {
            canPubliclyDisplayMessages: true,
          },
        },
        existing
      );
      const updated = await updateUserServerSettings(
        {
          serverId: server.id,
          userId: account.id,
          flags: {
            messageIndexingDisabled: true,
          },
        },
        null
      );
      expect(updated.flags.canPubliclyDisplayMessages).toBe(false);
      expect(updated.flags.messageIndexingDisabled).toBe(true);
      const found = await findUserServerSettingsById({
        serverId: server.id,
        userId: account.id,
      });
      expect(found!.flags.canPubliclyDisplayMessages).toBe(false);
      expect(found!.flags.messageIndexingDisabled).toBe(true);
    });
    it("should delete user server messages when setting indexing enabled to false", async () => {
      const chnl = mockChannel(server);
      await createChannel(chnl);
      const msg = await upsertMessage(mockMessage(server, chnl, account));
      const createdMsg = await findMessageById(msg.id);
      expect(createdMsg).not.toBe(null);
      const updated = await updateUserServerSettings(
        {
          serverId: server.id,
          userId: account.id,
          flags: {
            messageIndexingDisabled: true,
          },
        },
        null
      );
      expect(updated.flags.canPubliclyDisplayMessages).toBe(false);
      expect(updated.flags.messageIndexingDisabled).toBe(true);
      const found = await findUserServerSettingsById({
        serverId: server.id,
        userId: account.id,
      });
      expect(found!.flags.canPubliclyDisplayMessages).toBe(false);
      expect(found!.flags.messageIndexingDisabled).toBe(true);
      const deletedMsg = await findMessageById(msg.id);
      expect(deletedMsg).toBe(null);
    });
    it("should throw an error when trying to grant consent when indexing is disabled", async () => {
      await updateUserServerSettings(
        {
          serverId: server.id,
          userId: account.id,
          flags: {
            messageIndexingDisabled: true,
          },
        },
        null
      );
      await expect(
        updateUserServerSettings(
          {
            serverId: server.id,
            userId: account.id,
            flags: {
              canPubliclyDisplayMessages: true,
            },
          },
          null
        )
      ).rejects.toThrowError(
        CANNOT_GRANT_CONSENT_TO_PUBLICLY_DISPLAY_MESSAGES_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE
      );
    });
  });
});
