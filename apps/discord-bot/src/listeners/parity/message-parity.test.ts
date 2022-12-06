import MockDiscord from "~test/mock";

describe("Bot", () => {
  it("should be able to create a new bot", () => {
    const bot = new MockDiscord();
    expect(bot).toBeDefined();
    expect(bot.client).toBeDefined();
  });
  it("should create and listen to a simple listener", async () => {
    const bot = new MockDiscord();
    await bot.client.login("test");
    const sync_delete = bot.client.stores
      .get("listeners")
      .find((listener) => listener.name === "MessageDeletedWatcher");
    expect(sync_delete).toBeDefined();
    vitest.spyOn(sync_delete, "run" as never);
    bot.client.emit("messageDelete", bot.message);
    expect(sync_delete.run).toHaveBeenCalled();
  });
});
