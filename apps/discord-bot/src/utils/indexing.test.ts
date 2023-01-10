import { setupBot } from "~discord-bot/test/utils/discordjs/scenarios";

beforeEach(async () => {
  const data = await setupBot();
});

describe("Indexing", () => {
  describe("Index Root Channel", () => {
    it("should index root channel with a text channel", async () => {});
    it("should index root channel with a news channel", async () => {});
    it("should index root channel with a forum channel", async () => {});
  });
  describe("Add Solutions To Messages", () => {
    it("should add solutions to messages", async () => {});
  });
  describe("Convert To AO Data Types", () => {
    it("should convert multiple of the same user to one user", async () => {});
    it("should convert multiple of the same thread to one thread", async () => {});
    it("should convert multiple of the same message to one message", async () => {});
  });
  describe("Filter Messages", () => {
    it("should filter system messages", async () => {});
    it("should filter messages from users with message indexing disabled", async () => {});
  });
  describe("Fetch All Channel Messages With Threads", () => {
    it("should fetch all channel messages with no threads", async () => {});
    it("should fetch all channel messages and all thread messages", async () => {});
  });
  describe("Fetch All Messages", () => {
    it("should fetch all messages", async () => {});
    it("should fetch all messages with a limit", async () => {});
    it("should fetch all messages with a limit and a start", async () => {});
  });
});
