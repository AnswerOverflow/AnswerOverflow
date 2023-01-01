import { clearDatabase, DiscordAccount } from "@answeroverflow/db";
import { getGeneralScenario } from "~api/test/utils";
import { discordAccountRouter } from "./discord-accounts";

// eslint-disable-next-line no-unused-vars
let discord_accounts_router: ReturnType<typeof discordAccountRouter["createCaller"]>;
let account1: DiscordAccount;
let account2: DiscordAccount;
beforeEach(async () => {
  const { data1 } = await getGeneralScenario();
  discord_accounts_router = discordAccountRouter.createCaller(data1.bot_caller_ctx);
  account1 = data1.guild_owner_member;
  account2 = data1.guild_default_member;
  await clearDatabase();
});

describe("Discord Account Create", () => {
  it("should create a discord account", async () => {
    const new_account = await discord_accounts_router.create(account1);
    expect(new_account).toStrictEqual(account1);
  });
  it("should bulk create multiple discord accounts", async () => {
    const new_accounts = await discord_accounts_router.createBulk([account1, account2]);
    expect(new_accounts).toStrictEqual([account1, account2]);
  });
});

describe("Discord Account Update", () => {
  it("should update a discord account", async () => {
    const created_account = await discord_accounts_router.create(account1);
    const updated_account = await discord_accounts_router.update({
      id: created_account.id,
      update: {
        name: "updated-name",
      },
    });
    expect(updated_account).toStrictEqual({
      ...created_account,
      name: "updated-name",
    });
  });
  it("should bulk update multiple discord accounts", async () => {
    const created_accounts = await discord_accounts_router.createBulk([account1, account2]);
    const updated_accounts = await discord_accounts_router.updateBulk([
      {
        id: created_accounts[0].id,
        update: {
          name: "updated-name",
        },
      },
      {
        id: created_accounts[1].id,
        update: {
          name: "updated-name",
        },
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
    const upserted_account = await discord_accounts_router.upsert({
      create: account1,
      update: {
        id: account1.id,
        update: {
          name: "updated-name",
        },
      },
    });
    expect(upserted_account).toStrictEqual(account1);
  });
  it("should upsert an existing discord account", async () => {
    const created_account = await discord_accounts_router.create(account1);
    const upserted_account = await discord_accounts_router.upsert({
      create: account1,
      update: {
        id: created_account.id,
        update: {
          name: "updated-name",
        },
      },
    });
    expect(upserted_account).toStrictEqual({
      ...created_account,
      name: "updated-name",
    });
  });
  it("should bulk upsert create multiple discord accounts", async () => {
    const upserted_accounts = await discord_accounts_router.upsertBulk([
      {
        create: account1,
        update: {
          id: account1.id,
          update: {
            name: "updated-name",
          },
        },
      },
      {
        create: account2,
        update: {
          id: account2.id,
          update: {
            name: "updated-name",
          },
        },
      },
    ]);
    expect(upserted_accounts).toStrictEqual([account1, account2]);
  });
  it("should bulk upsert update multiple discord accounts", async () => {
    const created_accounts = await discord_accounts_router.createBulk([account1, account2]);
    const upserted_accounts = await discord_accounts_router.upsertBulk([
      {
        create: account1,
        update: {
          id: created_accounts[0].id,
          update: {
            name: "updated-name",
          },
        },
      },
      {
        create: account2,
        update: {
          id: created_accounts[1].id,
          update: {
            name: "updated-name2",
          },
        },
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
    const created_account = await discord_accounts_router.create(account1);
    const upserted_accounts = await discord_accounts_router.upsertBulk([
      {
        create: account1,
        update: {
          id: created_account.id,
          update: {
            name: "updated-name",
          },
        },
      },
      {
        create: account2,
        update: {
          id: account2.id,
          update: {
            name: "updated-name2",
          },
        },
      },
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
