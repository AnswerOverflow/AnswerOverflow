import {
  createDiscordAccount,
  createManyDiscordAccounts,
  DiscordAccount,
  findDiscordAccountById,
} from "@answeroverflow/db";
import { mockDiscordAccount } from "@answeroverflow/db-mock";
import { pick } from "@answeroverflow/utils";

import { testAllDataVariants, mockAccountCallerCtx, testAllSources } from "~api/test/utils";
import { discord_account_router } from "./discord-accounts";

let discord_account: DiscordAccount;
let discord_account2: DiscordAccount;
function pickPublicFields(discord_account: DiscordAccount) {
  return pick(discord_account, ["id", "name", "avatar"]);
}

beforeEach(() => {
  discord_account = mockDiscordAccount();
  discord_account2 = mockDiscordAccount();
});
describe("Discord Account Operations", () => {
  describe("Discord Account By Id", () => {
    beforeEach(async () => {
      await createDiscordAccount(discord_account);
    });

    it("should test all varaints of finding a discord account by id", async () => {
      await testAllDataVariants({
        async fetch({ source }) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discord_account_router.createCaller(ctx);
          const data = await router.byId(discord_account.id);
          return {
            data,
            private_data_format: discord_account,
            public_data_format: pickPublicFields(discord_account),
          };
        },
      });
    });
  });
  describe("Discord Account By Id Many", () => {
    beforeEach(async () => {
      await createManyDiscordAccounts([discord_account, discord_account2]);
    });
    it("should test all varaints of finding many discord accounts by id", async () => {
      await testAllDataVariants({
        async fetch({ source }) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discord_account_router.createCaller(ctx);
          const data = await router.byIdMany([discord_account.id, discord_account2.id]);
          return {
            data,
            private_data_format: [discord_account, discord_account2],
            public_data_format: [
              pickPublicFields(discord_account),
              pickPublicFields(discord_account2),
            ],
          };
        },
      });
    });
  });
  describe("Discord Account Create", () => {
    it("should test all varaints of creating a discord account that a user doesn't own", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discord_account_router.createCaller(ctx);
          await expect(router.create(discord_account)).rejects.toThrowError();
        },
      });
    });
    it("should test all varaints of creating a discord account that a user owns", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          const router = discord_account_router.createCaller(ctx);
          const discord_account_created = await router.create(account);
          expect(discord_account_created).toEqual(account);
        },
      });
    });
    test.todo("test all variants of creating a deleted discord account");
  });
  describe("Discord Account Update", () => {
    beforeEach(async () => {
      await createDiscordAccount(discord_account);
    });
    it("should test all varaints of updating a discord account as a user who does not own the account", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discord_account_router.createCaller(ctx);
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
          await createDiscordAccount(account);
          const router = discord_account_router.createCaller(ctx);
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
  describe("Discord Account Delete", () => {
    beforeEach(async () => {
      await createDiscordAccount(discord_account);
    });
    it("should test all varaints of deleting a discord account that the user does not own", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discord_account_router.createCaller(ctx);
          await expect(router.delete(discord_account.id)).rejects.toThrowError();
          await expect(findDiscordAccountById(discord_account.id)).resolves.toEqual(
            discord_account
          );
        },
      });
    });
    it("should test all varaints of deleting a discord account that the user owns", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          await createDiscordAccount(account);
          const router = discord_account_router.createCaller(ctx);
          const discord_account_deleted = await router.delete(account.id);
          expect(discord_account_deleted).toBeTruthy();
          await expect(findDiscordAccountById(account.id)).resolves.toBeNull();
        },
      });
    });
  });
  describe("Discord Account Upsert", () => {
    describe("Discord Account Upsert Create", () => {
      it("should test all varaints of upsert creating a discord account that the user does not own", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx } = await mockAccountCallerCtx(source);
            const router = discord_account_router.createCaller(ctx);
            await expect(router.upsert(discord_account)).rejects.toThrowError();
          },
        });
      });
      it("should test all varaints of upsert creating a discord account that the user owns", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx, account } = await mockAccountCallerCtx(source);
            await createDiscordAccount(account);
            const router = discord_account_router.createCaller(ctx);
            const discord_account_created = await router.upsert(account);
            expect(discord_account_created).toEqual(account);
          },
        });
      });
      describe("Discord Account Upsert Update", () => {
        beforeEach(async () => {
          await createDiscordAccount(discord_account);
        });
        it("should test all varaints of upsert updating a discord account that the user does not own", async () => {
          await testAllSources({
            async operation(source) {
              const { ctx } = await mockAccountCallerCtx(source);
              const router = discord_account_router.createCaller(ctx);
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
              await createDiscordAccount(account);
              const router = discord_account_router.createCaller(ctx);
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
});
