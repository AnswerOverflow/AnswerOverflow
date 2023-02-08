import type { Server } from "@answeroverflow/prisma-types";
import { mockServer } from "@answeroverflow/db-mock";
import { createServer, findServerById, updateServer } from "./server";

let server: Server;

beforeEach(() => {
  server = mockServer();
});

describe("Server", () => {
  describe("Create Server", () => {
    it("should create server settings with read the rules consent enabled", async () => {
      // setup
      const created = await createServer({
        ...server,
        flags: {
          read_the_rules_consent_enabled: true,
        },
      });
      expect(created.flags.read_the_rules_consent_enabled).toBe(true);
      const found = await findServerById(server.id);
      expect(found!.flags.read_the_rules_consent_enabled).toBe(true);
    });
  });
  describe("Update Server", () => {
    let existing: Server;
    beforeEach(async () => {
      existing = await createServer(server);
    });
    it("should update server with consent enabled enable", async () => {
      const updated = await updateServer(
        {
          ...server,
          flags: {
            read_the_rules_consent_enabled: true,
          },
        },
        existing
      );
      expect(updated.flags.read_the_rules_consent_enabled).toBe(true);
      const found = await findServerById(server.id);
      expect(found!.flags.read_the_rules_consent_enabled).toBe(true);
    });
  });
});
