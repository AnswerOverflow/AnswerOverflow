import { DiscordAccount } from "@answeroverflow/db";
import { mockAccount } from "@answeroverflow/db-mock";
import { createAnswerOverflowBotCtx, testAllSources, mockAccountCallerCtx } from "~api/test/utils";
import { discordAccountRouter } from "../accounts/discord-accounts";
import { ignored_discord_account_router } from "./ignored-discord-account";

let discord_account: DiscordAccount;
let discord_account_2: DiscordAccount;
let ao_bot_discord_account_router: ReturnType<(typeof discordAccountRouter)["createCaller"]>;
let ao_bot_ignored_account_router: ReturnType<
  (typeof ignored_discord_account_router)["createCaller"]
>;
beforeEach(async () => {
  discord_account = mockAccount();
  discord_account_2 = mockAccount();
  const bot = await createAnswerOverflowBotCtx();
  ao_bot_discord_account_router = discordAccountRouter.createCaller(bot);
  ao_bot_ignored_account_router = ignored_discord_account_router.createCaller(bot);
});

describe("Ignored Discord Account Operations", () => {
  describe("Ignored Discord Account Upsert", () => {
    it("should upsert an ignored discord account as the answer overflow bot", async () => {
      const result = await ao_bot_ignored_account_router.upsert(discord_account.id);
      expect(result).toEqual({ id: discord_account.id });
    });
    it("should fail to upsert an ignored discord account if that user exists in the database", async () => {
      await ao_bot_discord_account_router.create(discord_account);
      await expect(ao_bot_ignored_account_router.upsert(discord_account.id)).rejects.toThrowError();
    });
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
  });
  describe("Ignored Discord Account By Id", () => {
    it("should find an ignored discord account by id as the answer overflow bot", async () => {
      await ao_bot_ignored_account_router.upsert(discord_account.id);
      const result = await ao_bot_ignored_account_router.byId(discord_account.id);
      expect(result).toEqual({ id: discord_account.id });
    });
    it("should fail to find an ignored discord account by id that is not the user", async () => {
      await testAllSources({
        async operation(source) {
          const account = mockAccount();
          const { ctx } = await mockAccountCallerCtx(source);
          await ao_bot_ignored_account_router.upsert(account.id);
          const router = ignored_discord_account_router.createCaller(ctx);
          await expect(router.byId(account.id)).rejects.toThrowError();
        },
      });
    });
    it("should succeed to find an ignored discord account by id that is the user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          await ao_bot_ignored_account_router.upsert(account.id);
          const router = ignored_discord_account_router.createCaller(ctx);
          await expect(router.byId(account.id)).resolves.toEqual({ id: account.id });
        },
      });
    });
  });
  describe("Ignored Discord Account Many", () => {
    it("should find many ignored discord accounts as the answer overflow bot", async () => {
      await ao_bot_ignored_account_router.upsert(discord_account.id);
      await ao_bot_ignored_account_router.upsert(discord_account_2.id);
      const result = await ao_bot_ignored_account_router.byIdMany([
        discord_account.id,
        discord_account_2.id,
      ]);
      expect(result).toContainEqual({ id: discord_account.id });
      expect(result).toContainEqual({ id: discord_account_2.id });
    });
    it("should fail to find many ignored discord accounts that are not the user", async () => {
      await testAllSources({
        async operation(source) {
          const account = mockAccount();
          const account2 = mockAccount();
          const { ctx } = await mockAccountCallerCtx(source);
          await ao_bot_ignored_account_router.upsert(account.id);
          await ao_bot_ignored_account_router.upsert(account2.id);
          const router = ignored_discord_account_router.createCaller(ctx);
          await expect(router.byIdMany([account.id, account2.id])).rejects.toThrowError();
        },
      });
    });
    it("should succeed to find many ignored discord accounts that are the user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          await ao_bot_ignored_account_router.upsert(account.id);
          const router = ignored_discord_account_router.createCaller(ctx);
          await expect(router.byIdMany([account.id])).resolves.toEqual([{ id: account.id }]);
        },
      });
    });
  });
  describe("Stop Ignoring Discord Accounts", () => {
    it("should stop ignoring a discord account as the answer overflow bot", async () => {
      await ao_bot_ignored_account_router.upsert(discord_account.id);
      const result = await ao_bot_ignored_account_router.stopIgnoring(discord_account.id);
      expect(result).toEqual({ id: discord_account.id });
    });
    it("should fail to stop ignoring a discord account that is not the user", async () => {
      await testAllSources({
        async operation(source) {
          const account = mockAccount();
          const { ctx } = await mockAccountCallerCtx(source);
          await ao_bot_ignored_account_router.upsert(account.id);
          const router = ignored_discord_account_router.createCaller(ctx);
          await expect(router.stopIgnoring(account.id)).rejects.toThrowError();
        },
      });
    });
    it("should succeed to stop ignoring a discord account that is the user", async () => {
      await testAllSources({
        async operation(source) {
          const { ctx, account } = await mockAccountCallerCtx(source);
          await ao_bot_ignored_account_router.upsert(account.id);
          const router = ignored_discord_account_router.createCaller(ctx);
          await expect(router.stopIgnoring(account.id)).resolves.toEqual({ id: account.id });
        },
      });
    });
  });
});
