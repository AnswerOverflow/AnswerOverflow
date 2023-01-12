/* eslint-disable no-unused-vars */
import { clearDatabase, DiscordAccount } from "@answeroverflow/db";
import { getGeneralScenario } from "~api/test/utils";
import { ignored_discord_account_router } from "./ignored-discord-account";

let ignored_account_bot_caller: ReturnType<(typeof ignored_discord_account_router)["createCaller"]>;
let account1_ignored_account_caller: ReturnType<
  (typeof ignored_discord_account_router)["createCaller"]
>;
let account2_ignored_account_caller: ReturnType<
  (typeof ignored_discord_account_router)["createCaller"]
>;
let account1: DiscordAccount;
let account2: DiscordAccount;
beforeEach(async () => {
  const { data1 } = await getGeneralScenario();
  ignored_account_bot_caller = ignored_discord_account_router.createCaller(data1.bot_caller_ctx);
  account1_ignored_account_caller = ignored_discord_account_router.createCaller(
    data1.account1_guild_manager_ctx
  );
  account2_ignored_account_caller = ignored_discord_account_router.createCaller(
    data1.account2_default_member_ctx
  );
  account1 = data1.account1_guild_manager;
  account2 = data1.account2_default_member;
  await clearDatabase();
});

describe("Ignored Discord Account Operations", () => {
  describe("Ignored Account Upsert", () => {
    it("should upsert a new ignored account", async () => {
      const upserted_account = await account1_ignored_account_caller.upsert(account1.id);
      expect(upserted_account).toStrictEqual({
        id: account1.id,
      });
    });
    it("should upsert an existing ignored account", async () => {
      const upserted_account = await account1_ignored_account_caller.upsert(account1.id);
      expect(upserted_account).toStrictEqual({
        id: account1.id,
      });
      const upserted_account_again = await account1_ignored_account_caller.upsert(account1.id);
      expect(upserted_account_again).toStrictEqual({
        id: account1.id,
      });
    });
    it("should fail to upsert the account if they are not the owner of it", async () => {
      await expect(account2_ignored_account_caller.upsert(account1.id)).rejects.toThrowError(
        "not authorized"
      );
    });
  });
  describe("Ignored Account By Id", () => {
    it("should get an ignored account by id", async () => {
      const upserted_account = await account1_ignored_account_caller.upsert(account1.id);
      const found_account = await ignored_account_bot_caller.byId(account1.id);
      expect(found_account).toStrictEqual(upserted_account);
    });
    it("should throw not found if the account is not ignored", async () => {
      await expect(ignored_account_bot_caller.byId(account1.id)).rejects.toThrowError("not found");
    });
  });
  describe("Ignored Account By Id Many", () => {
    it("should find multiple ignored accounts by id", async () => {
      await account1_ignored_account_caller.upsert(account1.id);
      await account2_ignored_account_caller.upsert(account2.id);
      const found_accounts = await ignored_account_bot_caller.byIdMany([account1.id, account2.id]);
      expect(found_accounts.length).toBe(2);
    });
  });
});
