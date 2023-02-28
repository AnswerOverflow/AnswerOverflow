import { addFlagsToServer, Server } from "@answeroverflow/prisma-types";
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
          readTheRulesConsentEnabled: true,
        },
      });
      expect(created.flags.readTheRulesConsentEnabled).toBe(true);
      const found = await findServerById(server.id);
      expect(found!.flags.readTheRulesConsentEnabled).toBe(true);
    });
  });
  describe("Update Server", () => {
    let existing: Server;
    beforeEach(async () => {
      existing = await createServer(server);
    });
    it("should update server with consent enabled enable", async () => {
      const updated = await updateServer({
        update: {
          ...server,
          flags: {
            readTheRulesConsentEnabled: true,
          },
        },
        existing,
      });
      expect(updated.flags.readTheRulesConsentEnabled).toBe(true);
      const found = await findServerById(server.id);
      expect(found!.flags.readTheRulesConsentEnabled).toBe(true);
    });
  });
  describe("Find Server By Id", () => {
    let existing: Server;
    beforeEach(async () => {
      existing = await createServer(server);
    });
    it("should find server by id", async () => {
      const found = await findServerById(server.id);
      expect(found).toStrictEqual(existing);
    });
    it("should return null if server not found", async () => {
      const found = await findServerById("not-found");
      expect(found).toBeNull();
    });
  });
  describe("Upsert Server", () => {
    it("should upsert create a server", async () => {
      const created = await createServer(server);
      expect(created).toEqual(addFlagsToServer(server));
    });
    it("should upsert update a server", async () => {
      const created = await createServer(server);
      const updated = await updateServer({
        update: {
          ...server,
          flags: {
            readTheRulesConsentEnabled: true,
          },
        },
        existing: created,
      });
      expect(updated.flags.readTheRulesConsentEnabled).toBe(true);
    });
  });
});
