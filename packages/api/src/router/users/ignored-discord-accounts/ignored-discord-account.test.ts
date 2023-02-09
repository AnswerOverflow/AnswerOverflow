import {
  createDiscordAccount,
  DiscordAccount,
  upsertIgnoredDiscordAccount,
} from "@answeroverflow/db";
import { mockDiscordAccount } from "@answeroverflow/db-mock";
import { testAllSources, mockAccountCallerCtx } from "~api/test/utils";
import { ignoredDiscordAccountRouter } from "./ignored-discord-account";

let discordAccount: DiscordAccount;
let discordAccount2: DiscordAccount;
beforeEach(async () => {
  discordAccount = mockDiscordAccount();
  discordAccount2 = mockDiscordAccount();

  await createDiscordAccount(discordAccount);
  await upsertIgnoredDiscordAccount(discordAccount2.id);
});

describe("Ignored Discord Account Operations", () => {
  describe("Ignored Discord Account Upsert", () => {
    it("should fail to upsert ignored discord accounts that a user doesnt own", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = ignoredDiscordAccountRouter.createCaller(ctx);
          await expect(router.upsert(discordAccount.id)).rejects.toThrowError();
        },
      });
    });
    it("should succeed to upsert ignored discord accounts that a user owns", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          const router = ignoredDiscordAccountRouter.createCaller(ctx);
          await expect(router.upsert(account.id)).resolves.toEqual({ id: account.id });
        },
      });
    });
    test.todo("fail if account exists already as a non ignored discord account");
  });
  describe("Ignored Discord Account By Id", () => {
    it("should fail to find an ignored discord account by id that is not the user", async () => {
      await testAllSources({
        async operation(source) {
          const account = mockDiscordAccount();
          const { ctx } = await mockAccountCallerCtx(source);
          await upsertIgnoredDiscordAccount(account.id);
          const router = ignoredDiscordAccountRouter.createCaller(ctx);
          await expect(router.byId(account.id)).rejects.toThrowError();
        },
      });
    });
    it("should succeed to find an ignored discord account by id that is the user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          await upsertIgnoredDiscordAccount(account.id);
          const router = ignoredDiscordAccountRouter.createCaller(ctx);
          await expect(router.byId(account.id)).resolves.toEqual({ id: account.id });
        },
      });
    });
  });
  describe("Stop Ignoring Discord Accounts", () => {
    it("should fail to stop ignoring a discord account that is not the user", async () => {
      await testAllSources({
        async operation(source) {
          const account = mockDiscordAccount();
          const { ctx } = await mockAccountCallerCtx(source);
          await upsertIgnoredDiscordAccount(account.id);
          const router = ignoredDiscordAccountRouter.createCaller(ctx);
          await expect(router.stopIgnoring(account.id)).rejects.toThrowError();
        },
      });
    });
    it("should succeed to stop ignoring a discord account that is the user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          await upsertIgnoredDiscordAccount(account.id);
          const router = ignoredDiscordAccountRouter.createCaller(ctx);
          await expect(router.stopIgnoring(account.id)).resolves.toEqual({ id: account.id });
        },
      });
    });
  });
});
