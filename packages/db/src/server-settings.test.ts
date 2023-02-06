import type { Server } from "@answeroverflow/prisma-types";
import { mockServer } from "@answeroverflow/db-mock";
import { createServer } from "./server";
import {
  createServerSettings,
  findServerSettingsById,
  ServerSettingsWithFlags,
  updateServerSettings,
} from "./server-settings";

let server: Server;

beforeEach(async () => {
  server = mockServer();
  await createServer(server);
});

describe("User Server Settings", () => {
  describe("Create User Server Settings", () => {
    it("should create user server settings with consent enabled", async () => {
      // setup
      const created = await createServerSettings({
        server_id: server.id,
        flags: {
          read_the_rules_consent_enabled: true,
        },
      });
      expect(created.flags.read_the_rules_consent_enabled).toBe(true);
      const found = await findServerSettingsById(server.id);
      expect(found!.flags.read_the_rules_consent_enabled).toBe(true);
    });
  });
  describe("Update User Server Settings", () => {
    let existing: ServerSettingsWithFlags;
    beforeEach(async () => {
      existing = await createServerSettings({
        server_id: server.id,
      });
    });
    it("should update user server settings with consent enabled", async () => {
      const updated = await updateServerSettings(
        {
          server_id: server.id,
          flags: {
            read_the_rules_consent_enabled: true,
          },
        },
        existing
      );
      expect(updated.flags.read_the_rules_consent_enabled).toBe(true);
      const found = await findServerSettingsById(server.id);
      expect(found!.flags.read_the_rules_consent_enabled).toBe(true);
    });
  });
});
