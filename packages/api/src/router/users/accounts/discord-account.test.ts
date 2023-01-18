import { clearDatabase, DiscordAccount } from "@answeroverflow/db";
import {
  createAnswerOverflowBotCtx,
  mockAccount,
  mockAccountCallerCtx,
  testAllSources,
} from "~api/test/utils";
import { pick } from "~api/utils/utils";
import { discordAccountRouter } from "./discord-accounts";

let discord_account_router_bot_caller: ReturnType<(typeof discordAccountRouter)["createCaller"]>;
let discord_account: DiscordAccount;
let discord_account2: DiscordAccount;
function pickPublicFields(discord_account: DiscordAccount) {
  return pick(discord_account, ["id", "name", "avatar"]);
}

beforeEach(async () => {
  await clearDatabase();
  const bot = await createAnswerOverflowBotCtx();
  discord_account_router_bot_caller = discordAccountRouter.createCaller(bot);
  discord_account = mockAccount();
  discord_account2 = mockAccount();
});
describe("Discord Account Operations", () => {
  describe("Discord Account By Id", () => {
    beforeEach(async () => {
      await discord_account_router_bot_caller.create(discord_account);
    });
    it("should find a discord account by id", async () => {
      const discord_account_found = await discord_account_router_bot_caller.byId(
        discord_account.id
      );
      expect(discord_account_found).toEqual(discord_account);
    });
    it("should test all varaints of finding a discord account by id", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discordAccountRouter.createCaller(ctx);
          const discord_account_found = await router.byId(discord_account.id);
          expect(discord_account_found).toEqual(pickPublicFields(discord_account));
        },
      });
    });
  });
  describe("Discord Account By Id Many", () => {
    beforeEach(async () => {
      await discord_account_router_bot_caller.create(discord_account);
      await discord_account_router_bot_caller.create(discord_account2);
    });
    it("should find many discord accounts by id", async () => {
      const discord_accounts_found = await discord_account_router_bot_caller.byIdMany([
        discord_account.id,
        discord_account2.id,
      ]);
      expect(discord_accounts_found).toContainEqual(discord_account);
      expect(discord_accounts_found).toContainEqual(discord_account2);
    });
    it("should test all varaints of finding many discord accounts by id", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discordAccountRouter.createCaller(ctx);
          const discord_accounts_found = await router.byIdMany([
            discord_account.id,
            discord_account2.id,
          ]);
          expect(discord_accounts_found).toContainEqual(pickPublicFields(discord_account));
          expect(discord_accounts_found).toContainEqual(pickPublicFields(discord_account2));
        },
      });
    });
  });
  describe("Discord Account Create", () => {
    it("should create a discord account", async () => {
      const discord_account_created = await discord_account_router_bot_caller.create(
        discord_account
      );
      expect(discord_account_created).toEqual(discord_account);
    });
    it("should test all varaints of creating a discord account that a user doesn't own", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discordAccountRouter.createCaller(ctx);
          await expect(router.create(discord_account)).rejects.toThrowError();
        },
      });
    });
    it("should test all varaints of creating a discord account that a user owns", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          const router = discordAccountRouter.createCaller(ctx);
          const discord_account_created = await router.create(account);
          expect(discord_account_created).toEqual(account);
        },
      });
    });
  });
  describe("Discord Account Create Bulk", () => {
    it("should create many discord accounts", async () => {
      const discord_accounts_created = await discord_account_router_bot_caller.createBulk([
        discord_account,
        discord_account2,
      ]);
      expect(discord_accounts_created).toContainEqual(discord_account);
      expect(discord_accounts_created).toContainEqual(discord_account2);
    });
    it("should test all varaints of creating many discord accounts", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discordAccountRouter.createCaller(ctx);
          await expect(
            router.createBulk([discord_account, discord_account2])
          ).rejects.toThrowError();
        },
      });
    });
  });
  describe("Discord Account Update", () => {
    beforeEach(async () => {
      await discord_account_router_bot_caller.create(discord_account);
    });
    it("should update a discord account", async () => {
      const discord_account_updated = await discord_account_router_bot_caller.update({
        id: discord_account.id,
        name: "new name",
      });
      expect(discord_account_updated).toEqual({
        ...discord_account,
        name: "new name",
      });
    });
    it("should test all varaints of updating a discord account", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discordAccountRouter.createCaller(ctx);
          await expect(
            router.update({ id: discord_account.id, name: "new name" })
          ).rejects.toThrowError();
        },
      });
    });
  });
  describe("Discord Account Update Bulk", () => {
    beforeEach(async () => {
      await discord_account_router_bot_caller.create(discord_account);
      await discord_account_router_bot_caller.create(discord_account2);
    });
    it("should update many discord accounts", async () => {
      const discord_accounts_updated = await discord_account_router_bot_caller.updateBulk([
        { id: discord_account.id, name: "new name" },
        { id: discord_account2.id, name: "new name 2" },
      ]);
      expect(discord_accounts_updated).toContainEqual({
        ...discord_account,
        name: "new name",
      });
      expect(discord_accounts_updated).toContainEqual({
        ...discord_account2,
        name: "new name 2",
      });
    });
    it("should test all varaints of updating many discord accounts", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discordAccountRouter.createCaller(ctx);
          await expect(
            router.updateBulk([
              { id: discord_account.id, name: "new name" },
              { id: discord_account2.id, name: "new name 2" },
            ])
          ).rejects.toThrowError();
        },
      });
    });
  });
  describe("Discord Account Delete", () => {
    beforeEach(async () => {
      await discord_account_router_bot_caller.create(discord_account);
    });
    it("should delete a discord account", async () => {
      const discord_account_deleted = await discord_account_router_bot_caller.delete(
        discord_account.id
      );
      expect(discord_account_deleted).toBeTruthy();
      await expect(
        discord_account_router_bot_caller.byId(discord_account.id)
      ).rejects.toThrowError();
    });
    it("should test all varaints of deleting a discord account that the user does not own", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discordAccountRouter.createCaller(ctx);
          await expect(router.delete(discord_account.id)).rejects.toThrowError();
          await expect(discord_account_router_bot_caller.byId(discord_account.id)).resolves.toEqual(
            discord_account
          );
        },
      });
    });
    it("should test all varaints of deleting a discord account that the user owns", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          await discord_account_router_bot_caller.create(account);
          const router = discordAccountRouter.createCaller(ctx);
          const discord_account_deleted = await router.delete(account.id);
          expect(discord_account_deleted).toBeTruthy();
          await expect(discord_account_router_bot_caller.byId(account.id)).rejects.toThrowError();
        },
      });
    });
  });
  describe("Discord Account Upsert", () => {
    describe("Discord Account Upsert Create", () => {
      it("should upsert create a discord account as answer overflow", async () => {
        const discord_account_created = await discord_account_router_bot_caller.upsert(
          discord_account
        );
        expect(discord_account_created).toEqual(discord_account);
      });
      it("should test all varaints of upsert creating a discord account that the user does not own", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx } = await mockAccountCallerCtx(source);
            const router = discordAccountRouter.createCaller(ctx);
            await expect(router.upsert(discord_account)).rejects.toThrowError();
          },
        });
      });
      it("should test all varaints of upsert creating a discord account that the user owns", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx, account } = await mockAccountCallerCtx(source);
            await discord_account_router_bot_caller.create(account);
            const router = discordAccountRouter.createCaller(ctx);
            const discord_account_created = await router.upsert(account);
            expect(discord_account_created).toEqual(account);
          },
        });
      });
    });
    describe("Discord Account Upsert Update", () => {
      beforeEach(async () => {
        await discord_account_router_bot_caller.create(discord_account);
      });
      it("should upsert update a discord account as answer overflow", async () => {
        const discord_account_updated = await discord_account_router_bot_caller.upsert({
          ...discord_account,
          name: "new name",
        });
        expect(discord_account_updated).toEqual({
          ...discord_account,
          name: "new name",
        });
      });
      it("should test all varaints of upsert updating a discord account that the user does not own", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx } = await mockAccountCallerCtx(source);
            const router = discordAccountRouter.createCaller(ctx);
            await expect(
              router.upsert({ ...discord_account, name: "new name" })
            ).rejects.toThrowError();
          },
        });
      });
      it("should test all varaints of upsert updating a discord account that the user owns", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx, account } = await mockAccountCallerCtx(source);
            await discord_account_router_bot_caller.create(account);
            const router = discordAccountRouter.createCaller(ctx);
            const discord_account_updated = await router.upsert({
              ...account,
              name: "new name",
            });
            expect(discord_account_updated).toEqual({
              ...account,
              name: "new name",
            });
          },
        });
      });
    });
  });
  describe("Discord Account Bulk Upsert", () => {
    describe("Discord Account Bulk Upsert Create", () => {
      it("should bulk upsert create a discord account as answer overflow", async () => {
        const discord_accounts_created = await discord_account_router_bot_caller.upsertBulk([
          discord_account,
          discord_account2,
        ]);
        expect(discord_accounts_created).toContainEqual(discord_account);
        expect(discord_accounts_created).toContainEqual(discord_account2);
      });
      it("should test all varaints of bulk upsert creating a discord account that the user does not own", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx } = await mockAccountCallerCtx(source);
            const router = discordAccountRouter.createCaller(ctx);
            await expect(
              router.upsertBulk([discord_account, discord_account2])
            ).rejects.toThrowError();
          },
        });
      });
      it("should test all varaints of bulk upsert creating a discord account that the user owns", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx, account } = await mockAccountCallerCtx(source);
            await discord_account_router_bot_caller.create(account);
            const router = discordAccountRouter.createCaller(ctx);
            const discord_accounts_created = await router.upsertBulk([account, account]);
            expect(discord_accounts_created).toContainEqual(account);
            expect(discord_accounts_created).toContainEqual(account);
          },
        });
      });
    });
    describe("Discord Account Bulk Upsert Update", () => {
      beforeEach(async () => {
        await discord_account_router_bot_caller.create(discord_account);
        await discord_account_router_bot_caller.create(discord_account2);
      });
      it("should bulk upsert update a discord account as answer overflow", async () => {
        const discord_accounts_updated = await discord_account_router_bot_caller.upsertBulk([
          { ...discord_account, name: "new name" },
          { ...discord_account2, name: "new name" },
        ]);
        expect(discord_accounts_updated).toContainEqual({
          ...discord_account,
          name: "new name",
        });
        expect(discord_accounts_updated).toContainEqual({
          ...discord_account2,
          name: "new name",
        });
      });
      it("should test all varaints of bulk upsert updating a discord account that the user does not own", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx } = await mockAccountCallerCtx(source);
            const router = discordAccountRouter.createCaller(ctx);
            await expect(
              router.upsertBulk([
                { ...discord_account, name: "new name" },
                { ...discord_account2, name: "new name" },
              ])
            ).rejects.toThrowError();
          },
        });
      });
      it("should test all varaints of bulk upsert updating a discord account that the user owns", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx, account } = await mockAccountCallerCtx(source);
            await discord_account_router_bot_caller.create(account);
            const router = discordAccountRouter.createCaller(ctx);
            const discord_accounts_updated = await router.upsertBulk([
              { ...account, name: "new name" },
              { ...account, name: "new name" },
            ]);
            expect(discord_accounts_updated).toContainEqual({
              ...account,
              name: "new name",
            });
            expect(discord_accounts_updated).toContainEqual({
              ...account,
              name: "new name",
            });
          },
        });
      });
    });
  });
});
