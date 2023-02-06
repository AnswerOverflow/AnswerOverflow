import type { DiscordAccount } from "..";
import { upsertManyDiscordAccounts } from "./discord-account";
import { mockDiscordAccount } from "@answeroverflow/db-mock";
let account1: DiscordAccount;
let account2: DiscordAccount;
let account3: DiscordAccount;
beforeEach(() => {
  account1 = mockDiscordAccount();
  account2 = mockDiscordAccount();
  account3 = mockDiscordAccount();
});

describe("Discord Account Operations", () => {
  describe("Discord Account Upsert Many", () => {
    it("should create many discord accounts", async () => {
      await upsertManyDiscordAccounts([account1, account2, account3]);
    });
    it("should update many discord accounts", async () => {});
    it("should create and update many discord accounts", async () => {});
  });
});
