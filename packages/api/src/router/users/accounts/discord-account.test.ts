import { clearDatabase, DiscordAccount } from "@answeroverflow/db";
import { getGeneralScenario } from "~api/test/utils";
import { pick } from "~api/utils/utils";
import { ignored_discord_account_router } from "../ignored-discord-accounts/ignored-discord-account";
import { discordAccountRouter } from "./discord-accounts";

let discord_account_router_bot_caller: ReturnType<(typeof discordAccountRouter)["createCaller"]>;
let ignored_account_router_account1_caller: ReturnType<
  (typeof ignored_discord_account_router)["createCaller"]
>;
let account1_router: ReturnType<(typeof discordAccountRouter)["createCaller"]>;
let account2_router: ReturnType<(typeof discordAccountRouter)["createCaller"]>;
let account1: DiscordAccount;
let account2: DiscordAccount;
beforeEach(async () => {
  const { data1 } = await getGeneralScenario();
  discord_account_router_bot_caller = discordAccountRouter.createCaller(data1.bot_caller_ctx);
  ignored_account_router_account1_caller = ignored_discord_account_router.createCaller(
    data1.account1_guild_manager_ctx
  );
  account1 = data1.account1_guild_manager;
  account1_router = discordAccountRouter.createCaller(data1.account1_guild_manager_ctx);
  account2_router = discordAccountRouter.createCaller(data1.account2_default_member_ctx);
  account2 = data1.account2_default_member;
  await clearDatabase();
});
describe("Discord Account Operations", () => {
  describe("Discord Account Create", () => {
    it("should create a discord account", async () => {
      const new_account = await discord_account_router_bot_caller.create(account1);
      expect(new_account).toStrictEqual(account1);
    });
    it("should throw an error if the discord account is being ignored", async () => {
      await ignored_account_router_account1_caller.upsert(account1.id);
      await expect(discord_account_router_bot_caller.create(account1)).rejects.toThrowError(
        "Cannot create discord account for ignored user. Enable indexing of your account first"
      );
    });
    it("should successfully create a discord account for a user who was once ignored and is now no longer ignored", async () => {
      await ignored_account_router_account1_caller.upsert(account1.id);
      await ignored_account_router_account1_caller.stopIgnoring(account1.id);
      const new_account = await discord_account_router_bot_caller.create(account1);
      expect(new_account).toBeDefined();
    });
  });

  describe("Discord Account Create Bulk", () => {
    it("should bulk create multiple discord accounts", async () => {
      const new_accounts = await discord_account_router_bot_caller.createBulk([account1, account2]);
      expect(new_accounts).toStrictEqual([account1, account2]);
    });
    it("should create only non ignored accounts", async () => {
      await ignored_account_router_account1_caller.upsert(account1.id);
      const new_accounts = await discord_account_router_bot_caller.createBulk([account1, account2]);
      expect(new_accounts).toStrictEqual([account2]);
      await expect(discord_account_router_bot_caller.byId(account1.id)).rejects.toThrowError(
        "Could not find discord account"
      );
      await expect(discord_account_router_bot_caller.byId(account2.id)).resolves.toStrictEqual(
        account2
      );
    });
  });

  describe("Discord Account Update", () => {
    it("should update a discord account", async () => {
      const created_account = await discord_account_router_bot_caller.create(account1);
      const updated_account = await discord_account_router_bot_caller.update({
        id: created_account.id,
        name: "updated-name",
      });
      expect(updated_account).toStrictEqual({
        ...created_account,
        name: "updated-name",
      });
    });
  });

  describe("Discord Account Update Bulk", () => {
    it("should bulk update multiple discord accounts", async () => {
      const created_accounts = await discord_account_router_bot_caller.createBulk([
        account1,
        account2,
      ]);
      const updated_accounts = await discord_account_router_bot_caller.updateBulk([
        {
          id: created_accounts[0]!.id,
          name: "updated-name",
        },
        {
          id: created_accounts[1]!.id,
          name: "updated-name",
        },
      ]);
      expect(updated_accounts).toStrictEqual([
        {
          ...created_accounts[0],
          name: "updated-name",
        },
        {
          ...created_accounts[1],
          name: "updated-name",
        },
      ]);
    });
  });

  describe("Discord Account Upsert", () => {
    it("should upsert a new discord account", async () => {
      const upserted_account = await discord_account_router_bot_caller.upsert(account1);
      expect(upserted_account).toStrictEqual(account1);
    });
    it("should upsert an existing discord account", async () => {
      const created_account = await discord_account_router_bot_caller.create(account1);
      const upserted_account = await discord_account_router_bot_caller.upsert({
        id: created_account.id,
        name: "updated-name",
      });
      expect(upserted_account).toStrictEqual({
        ...created_account,
        name: "updated-name",
      });
    });
  });

  describe("Discord Account Upsert Bulk", () => {
    it("should bulk upsert create multiple discord accounts", async () => {
      const upserted_accounts = await discord_account_router_bot_caller.upsertBulk([
        account1,
        account2,
      ]);
      expect(upserted_accounts).toStrictEqual([account1, account2]);
    });
    it("should bulk upsert update multiple discord accounts", async () => {
      const created_accounts = await discord_account_router_bot_caller.createBulk([
        account1,
        account2,
      ]);
      const upserted_accounts = await discord_account_router_bot_caller.upsertBulk([
        {
          id: created_accounts[0]!.id,
          name: "updated-name",
        },
        {
          name: "updated-name2",
          id: created_accounts[1]!.id,
        },
      ]);
      expect(upserted_accounts).toStrictEqual([
        {
          ...created_accounts[0],
          name: "updated-name",
        },
        {
          ...created_accounts[1],
          name: "updated-name2",
        },
      ]);
    });
    it("should bulk upsert create and update discord accounts", async () => {
      const created_account = await discord_account_router_bot_caller.create(account1);
      const upserted_accounts = await discord_account_router_bot_caller.upsertBulk([
        {
          id: created_account.id,
          name: "updated-name",
        },
        account2,
      ]);
      expect(upserted_accounts).toStrictEqual([
        {
          ...created_account,
          name: "updated-name",
        },
        account2,
      ]);
    });
  });

  describe("Discord Account Delete", () => {
    it("should delete a discord account", async () => {
      const created_account = await discord_account_router_bot_caller.create(account1);
      await discord_account_router_bot_caller.delete(created_account.id);
      await expect(discord_account_router_bot_caller.byId(created_account.id)).rejects.toThrowError(
        "Could not find discord account"
      );
    });
    it("should add a deleted discord account to the ignored list", async () => {
      const created_account = await discord_account_router_bot_caller.create(account1);
      await discord_account_router_bot_caller.delete(created_account.id);
      await expect(
        ignored_account_router_account1_caller.byId(created_account.id)
      ).resolves.toEqual({
        id: created_account.id,
      });
    });
    it("should not add a deleted discord account to the deleted list if the operation fails", async () => {
      await expect(discord_account_router_bot_caller.delete(account1.id)).rejects.toThrowError(
        "Could not find discord account"
      );
      await expect(ignored_account_router_account1_caller.byId(account1.id)).rejects.toThrowError(
        "Ignored Discord account not found"
      );
    });
  });

  describe("Discord Account Find By Id", () => {
    it("should find a discord account by id", async () => {
      const created_account = await account1_router.create(account1);
      await expect(account1_router.byId(created_account.id)).resolves.toStrictEqual(
        created_account
      );
    });
    it("should find a discord ", async () => {
      const created_account = await account1_router.create(account1);
      const fetch = await account2_router.byId(created_account.id);
      expect(fetch).toStrictEqual(pick(created_account, "avatar", "id", "name"));
    });
  });

  describe("Discord Account Find By Id Many", () => {
    it("should find multiple discord accounts by id", async () => {
      const created_accounts = await account1_router.createBulk([account1, account2]);
      const data = await account1_router.byIdMany([
        created_accounts[0]!.id,
        created_accounts[1]!.id,
      ]);
      expect(data).toStrictEqual(created_accounts);
    });
  });
});
