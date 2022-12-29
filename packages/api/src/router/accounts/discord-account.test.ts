import { clearDatabase } from "@answeroverflow/db";
import { createContextInner } from "~api/router/context";
import { discordAccountRouter } from "./discord-accounts";

// eslint-disable-next-line no-unused-vars
let discord_accounts: ReturnType<typeof discordAccountRouter["createCaller"]>;
beforeEach(async () => {
  const a = await createContextInner({
    session: null,
    caller: "discord-bot",
    user_servers: [],
  });
  discord_accounts = discordAccountRouter.createCaller(a);
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
