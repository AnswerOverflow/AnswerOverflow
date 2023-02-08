import {
  createDiscordAccount,
  createManyDiscordAccounts,
  DiscordAccount,
  findDiscordAccountById,
} from "@answeroverflow/db";
import { mockDiscordAccount } from "@answeroverflow/db-mock";
import { pick } from "@answeroverflow/utils";

import { testAllDataVariants, mockAccountCallerCtx, testAllSources } from "~api/test/utils";
import { discordAccountRouter } from "./discord-accounts";

let discordAccount: DiscordAccount;
let discordAccount2: DiscordAccount;
function pickPublicFields(discordAccount: DiscordAccount) {
  return pick(discordAccount, ["id", "name", "avatar"]);
}

beforeEach(() => {
  discordAccount = mockDiscordAccount();
  discordAccount2 = mockDiscordAccount();
});
describe("Discord Account Operations", () => {
  describe("Discord Account By Id", () => {
    beforeEach(async () => {
      await createDiscordAccount(discordAccount);
    });

    it("should test all varaints of finding a discord account by id", async () => {
      await testAllDataVariants({
        async fetch({ source }) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discordAccountRouter.createCaller(ctx);
          const data = await router.byId(discordAccount.id);
          return {
            data,
            privateDataFormat: discordAccount,
            publicDataFormat: pickPublicFields(discordAccount),
          };
        },
      });
    });
  });
  describe("Discord Account By Id Many", () => {
    beforeEach(async () => {
      await createManyDiscordAccounts([discordAccount, discordAccount2]);
    });
    it("should test all varaints of finding many discord accounts by id", async () => {
      await testAllDataVariants({
        async fetch({ source }) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discordAccountRouter.createCaller(ctx);
          const data = await router.byIdMany([discordAccount.id, discordAccount2.id]);
          return {
            data,
            privateDataFormat: [discordAccount, discordAccount2],
            publicDataFormat: [pickPublicFields(discordAccount), pickPublicFields(discordAccount2)],
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
          const router = discordAccountRouter.createCaller(ctx);
          await expect(router.create(discordAccount)).rejects.toThrowError();
        },
      });
    });
    it("should test all varaints of creating a discord account that a user owns", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          const router = discordAccountRouter.createCaller(ctx);
          const discordAccountCreated = await router.create(account);
          expect(discordAccountCreated).toEqual(account);
        },
      });
    });
    test.todo("test all variants of creating a deleted discord account");
  });
  describe("Discord Account Update", () => {
    beforeEach(async () => {
      await createDiscordAccount(discordAccount);
    });
    it("should test all varaints of updating a discord account as a user who does not own the account", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discordAccountRouter.createCaller(ctx);
          await expect(
            router.update({ id: discordAccount.id, name: "new name" })
          ).rejects.toThrowError();
        },
      });
    });
    it("should test all varaints of updating a discord account as a user who owns the account", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          await createDiscordAccount(account);
          const router = discordAccountRouter.createCaller(ctx);
          const discordAccountUpdated = await router.update({
            id: account.id,
            name: "new name",
          });
          expect(discordAccountUpdated).toEqual({
            ...account,
            name: "new name",
          });
        },
      });
    });
  });
  describe("Discord Account Delete", () => {
    beforeEach(async () => {
      await createDiscordAccount(discordAccount);
    });
    it("should test all varaints of deleting a discord account that the user does not own", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = discordAccountRouter.createCaller(ctx);
          await expect(router.delete(discordAccount.id)).rejects.toThrowError();
          await expect(findDiscordAccountById(discordAccount.id)).resolves.toEqual(discordAccount);
        },
      });
    });
    it("should test all varaints of deleting a discord account that the user owns", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          await createDiscordAccount(account);
          const router = discordAccountRouter.createCaller(ctx);
          const discordAccountDeleted = await router.delete(account.id);
          expect(discordAccountDeleted).toBeTruthy();
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
            const router = discordAccountRouter.createCaller(ctx);
            await expect(router.upsert(discordAccount)).rejects.toThrowError();
          },
        });
      });
      it("should test all varaints of upsert creating a discord account that the user owns", async () => {
        await testAllSources({
          async operation(source) {
            const { ctx, account } = await mockAccountCallerCtx(source);
            await createDiscordAccount(account);
            const router = discordAccountRouter.createCaller(ctx);
            const discordAccountCreated = await router.upsert(account);
            expect(discordAccountCreated).toEqual(account);
          },
        });
      });
      describe("Discord Account Upsert Update", () => {
        beforeEach(async () => {
          await createDiscordAccount(discordAccount);
        });
        it("should test all varaints of upsert updating a discord account that the user does not own", async () => {
          await testAllSources({
            async operation(source) {
              const { ctx } = await mockAccountCallerCtx(source);
              const router = discordAccountRouter.createCaller(ctx);
              await expect(
                router.upsert({ ...discordAccount, name: "new name" })
              ).rejects.toThrowError();
            },
          });
        });
        it("should test all varaints of upsert updating a discord account that the user owns", async () => {
          await testAllSources({
            async operation(source) {
              const { ctx, account } = await mockAccountCallerCtx(source);
              await createDiscordAccount(account);
              const router = discordAccountRouter.createCaller(ctx);
              const discordAccountUpdated = await router.upsert({
                ...account,
                name: "new name",
              });
              expect(discordAccountUpdated).toEqual({
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
