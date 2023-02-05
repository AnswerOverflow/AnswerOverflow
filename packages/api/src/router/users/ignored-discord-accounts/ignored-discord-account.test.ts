import {
  createDiscordAccount,
  DiscordAccount,
  upsertIgnoredDiscordAccount,
} from "@answeroverflow/db";
import { mockAccount } from "@answeroverflow/db-mock";
import { testAllSources, mockAccountCallerCtx } from "~api/test/utils";
import { prisma } from "@answeroverflow/db";
import { ignored_discord_account_router } from "./ignored-discord-account";

let discord_account: DiscordAccount;
let discord_account_2: DiscordAccount;
beforeEach(async () => {
  discord_account = mockAccount();
  discord_account_2 = mockAccount();

  await createDiscordAccount(discord_account, prisma);
  await upsertIgnoredDiscordAccount(discord_account_2.id, prisma);
});

describe("Ignored Discord Account Operations", () => {
  describe("Ignored Discord Account Upsert", () => {
    it("should fail to upsert ignored discord accounts that a user doesnt own", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx } = await mockAccountCallerCtx(source);
          const router = ignored_discord_account_router.createCaller(ctx);
          await expect(router.upsert(discord_account.id)).rejects.toThrowError();
        },
      });
    });
    it("should succeed to upsert ignored discord accounts that a user owns", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          const router = ignored_discord_account_router.createCaller(ctx);
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
          const account = mockAccount();
          const { ctx } = await mockAccountCallerCtx(source);
          await upsertIgnoredDiscordAccount(account.id, prisma);
          const router = ignored_discord_account_router.createCaller(ctx);
          await expect(router.byId(account.id)).rejects.toThrowError();
        },
      });
    });
    it("should succeed to find an ignored discord account by id that is the user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          await upsertIgnoredDiscordAccount(account.id, prisma);
          const router = ignored_discord_account_router.createCaller(ctx);
          await expect(router.byId(account.id)).resolves.toEqual({ id: account.id });
        },
      });
    });
  });
  describe("Stop Ignoring Discord Accounts", () => {
    it("should fail to stop ignoring a discord account that is not the user", async () => {
      await testAllSources({
        async operation(source) {
          const account = mockAccount();
          const { ctx } = await mockAccountCallerCtx(source);
          await upsertIgnoredDiscordAccount(account.id, prisma);
          const router = ignored_discord_account_router.createCaller(ctx);
          await expect(router.stopIgnoring(account.id)).rejects.toThrowError();
        },
      });
    });
    it("should succeed to stop ignoring a discord account that is the user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          await upsertIgnoredDiscordAccount(account.id, prisma);
          const router = ignored_discord_account_router.createCaller(ctx);
          await expect(router.stopIgnoring(account.id)).resolves.toEqual({ id: account.id });
        },
      });
    });
  });
});
