import { clearDatabase, DiscordAccount } from "@answeroverflow/db";
import {
  createAnswerOverflowBotCtx,
  mockAccount,
  mockAccountCallerCtx,
  testAllDataVariants,
  testAllSources,
} from "~api/test/utils";
import { pick } from "~api/utils/utils";
import {
  IGNORED_ACCOUNT_MESSAGE,
  ignored_discord_account_router,
} from "../ignored-discord-accounts/ignored-discord-account";
import { discordAccountRouter } from "./discord-accounts";

let ao_bot_discord_account_router: ReturnType<(typeof discordAccountRouter)["createCaller"]>;
let ao_bot_ignored_discord_account_router: ReturnType<
  (typeof ignored_discord_account_router)["createCaller"]
>;
let discord_account: DiscordAccount;
let discord_account2: DiscordAccount;
function pickPublicFields(discord_account: DiscordAccount) {
  return pick(discord_account, ["id", "name", "avatar"]);
}

beforeEach(async () => {
  await clearDatabase();
  const bot = await createAnswerOverflowBotCtx();
  ao_bot_discord_account_router = discordAccountRouter.createCaller(bot);
  ao_bot_ignored_discord_account_router = ignored_discord_account_router.createCaller(bot);
  discord_account = mockAccount();
  discord_account2 = mockAccount();
});
describe("Discord Account Operations", () => {
  describe("Discord Account By Id", () => {
    beforeEach(async () => {
      await ao_bot_discord_account_router.create(discord_account);
    });
    it("should find a discord account by id as answer overflow bot", async () => {
      const discord_account_found = await ao_bot_discord_account_router.byId(discord_account.id);
      expect(discord_account_found).toEqual(discord_account);
    });
    it("should test all varaints of finding a discord account by id", async () => {
      await testAllDataVariants({
        async fetch({ source }) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discordAccountRouter.createCaller(ctx);
          return router.byId(discord_account.id);
        },
        private_data_format: discord_account,
        public_data_format: pickPublicFields(discord_account),
      });
    });
  });
  describe("Discord Account By Id Many", () => {
    beforeEach(async () => {
      await ao_bot_discord_account_router.create(discord_account);
      await ao_bot_discord_account_router.create(discord_account2);
    });
    it("should find many discord accounts by id as answer overflow bot", async () => {
      const discord_accounts_found = await ao_bot_discord_account_router.byIdMany([
        discord_account.id,
        discord_account2.id,
      ]);
      expect(discord_accounts_found).toContainEqual(discord_account);
      expect(discord_accounts_found).toContainEqual(discord_account2);
    });
    it("should test all varaints of finding many discord accounts by id", async () => {
      await testAllDataVariants({
        async fetch({ source }) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discordAccountRouter.createCaller(ctx);
          return router.byIdMany([discord_account.id, discord_account2.id]);
        },
        private_data_format: [discord_account, discord_account2],
        public_data_format: [pickPublicFields(discord_account), pickPublicFields(discord_account2)],
      });
    });
  });
  describe("Discord Account Create", () => {
    it("should succeed creating a discord account as the answer overflow bot", async () => {
      const discord_account_created = await ao_bot_discord_account_router.create(discord_account);
      expect(discord_account_created).toEqual(discord_account);
    });
    it("should fail to create an ignored discord account as the answer overflow bot", async () => {
      await ao_bot_ignored_discord_account_router.upsert(discord_account.id);
      await expect(ao_bot_discord_account_router.create(discord_account)).rejects.toThrowError(
        IGNORED_ACCOUNT_MESSAGE
      );
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
    it("should create many discord accounts as the ao bot", async () => {
      const discord_accounts_created = await ao_bot_discord_account_router.createBulk([
        discord_account,
        discord_account2,
      ]);
      expect(discord_accounts_created).toContainEqual(discord_account);
      expect(discord_accounts_created).toContainEqual(discord_account2);
    });
    it("should only create non ignored discord accounts when bulk creating", async () => {
      await ao_bot_ignored_discord_account_router.upsert(discord_account.id);
      const discord_accounts_created = await ao_bot_discord_account_router.createBulk([
        discord_account,
        discord_account2,
      ]);
      expect(discord_accounts_created).not.toContainEqual(discord_account);
      expect(discord_accounts_created).toContainEqual(discord_account2);
      await expect(ao_bot_discord_account_router.byId(discord_account.id)).rejects.toThrowError();
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
      await ao_bot_discord_account_router.create(discord_account);
    });
    it("should update a discord account as ao bot", async () => {
      const discord_account_updated = await ao_bot_discord_account_router.update({
        id: discord_account.id,
        name: "new name",
      });
      expect(discord_account_updated).toEqual({
        ...discord_account,
        name: "new name",
      });
    });
    it("should test all varaints of updating a discord account as a user who does not own the account", async () => {
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
    it("should test all varaints of updating a discord account as a user who owns the account", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          await ao_bot_discord_account_router.create(account);
          const router = discordAccountRouter.createCaller(ctx);
          const discord_account_updated = await router.update({
            id: account.id,
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
  describe("Discord Account Update Bulk", () => {
    beforeEach(async () => {
      await ao_bot_discord_account_router.create(discord_account);
      await ao_bot_discord_account_router.create(discord_account2);
    });
    it("should update many discord accounts as the ao bot", async () => {
      const discord_accounts_updated = await ao_bot_discord_account_router.updateBulk([
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
    it("should test all varaints of updating many discord accounts as a user who does not own them", async () => {
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
      await ao_bot_discord_account_router.create(discord_account);
    });
    it("should delete a discord account as ao bot", async () => {
      const discord_account_deleted = await ao_bot_discord_account_router.delete(
        discord_account.id
      );
      expect(discord_account_deleted).toBeTruthy();
      await expect(ao_bot_discord_account_router.byId(discord_account.id)).rejects.toThrowError();
    });
    it("should add a deleted account to the ignored accounts table", async () => {
      await ao_bot_discord_account_router.delete(discord_account.id);
      await expect(ao_bot_ignored_discord_account_router.byId(discord_account.id)).resolves.toEqual(
        pick(discord_account, ["id"])
      );
    });
    it("should test all varaints of deleting a discord account that the user does not own", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discordAccountRouter.createCaller(ctx);
          await expect(router.delete(discord_account.id)).rejects.toThrowError();
          await expect(ao_bot_discord_account_router.byId(discord_account.id)).resolves.toEqual(
            discord_account
          );
        },
      });
    });
    it("should test all varaints of deleting a discord account that the user owns", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          await ao_bot_discord_account_router.create(account);
          const router = discordAccountRouter.createCaller(ctx);
          const discord_account_deleted = await router.delete(account.id);
          expect(discord_account_deleted).toBeTruthy();
          await expect(ao_bot_discord_account_router.byId(account.id)).rejects.toThrowError();
        },
      });
    });
  });
  describe("Discord Account Upsert", () => {
    describe("Discord Account Upsert Create", () => {
      it("should upsert create a discord account as answer overflow", async () => {
        const discord_account_created = await ao_bot_discord_account_router.upsert(discord_account);
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
            await ao_bot_discord_account_router.create(account);
            const router = discordAccountRouter.createCaller(ctx);
            const discord_account_created = await router.upsert(account);
            expect(discord_account_created).toEqual(account);
          },
        });
      });
      describe("Discord Account Upsert Update", () => {
        beforeEach(async () => {
          await ao_bot_discord_account_router.create(discord_account);
        });
        it("should upsert update a discord account as answer overflow", async () => {
          const discord_account_updated = await ao_bot_discord_account_router.upsert({
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
              await ao_bot_discord_account_router.create(account);
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
  });
  describe("Discord Account Bulk Upsert", () => {
    describe("Discord Account Bulk Upsert Create", () => {
      it("should bulk upsert create a discord account as answer overflow", async () => {
        const discord_accounts_created = await ao_bot_discord_account_router.upsertBulk([
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
            await ao_bot_discord_account_router.create(account);
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
        await ao_bot_discord_account_router.create(discord_account);
        await ao_bot_discord_account_router.create(discord_account2);
      });
      it("should bulk upsert update a discord account as answer overflow", async () => {
        const discord_accounts_updated = await ao_bot_discord_account_router.upsertBulk([
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
            await ao_bot_discord_account_router.create(account);
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
