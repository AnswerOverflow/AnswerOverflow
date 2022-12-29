import { clearDatabase } from "@answeroverflow/db";
import { getGeneralScenario } from "~api/test/utils";
import { discordAccountRouter } from "./discord-accounts";

// eslint-disable-next-line no-unused-vars
let discord_accounts: ReturnType<typeof discordAccountRouter["createCaller"]>;
beforeEach(async () => {
  const { data1 } = await getGeneralScenario();
  discord_accounts = discordAccountRouter.createCaller(data1.bot_caller_ctx);
  await clearDatabase();
});

describe("Discord Account Create", () => {
  it("should create a discord account", async () => {
    const new_account = await discord_accounts.create({
      id: "523949187663134754",
      name: "test",
    });
    expect(new_account).toBeDefined();
  });
});
