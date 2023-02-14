import {
  createDiscordAccount,
  createManyDiscordAccounts,
  DiscordAccount,
} from "@answeroverflow/db";
import { mockDiscordAccount } from "@answeroverflow/db-mock";
import { pick } from "@answeroverflow/utils";

import { testAllDataVariants, mockAccountCallerCtx } from "~api/test/utils";
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
});
