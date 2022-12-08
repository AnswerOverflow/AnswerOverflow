import { mockClient, mockGuild, mockMessage, mockTextChannel } from "~test/mock";

describe("Bot", () => {
  it("should be able to create a new bot", () => {
    const bot = mockClient();
    expect(bot).toBeDefined();
  });
  it("should create and listen to a simple listener", async () => {
    const bot = mockClient();
    await bot.login("test");
    const sync_delete = bot.stores
      .get("listeners")
      .find((listener) => listener.name === "MessageDeletedWatcher");
    expect(sync_delete).toBeDefined();
    vitest.spyOn(sync_delete, "run" as never);
    bot.emit("messageDelete", mockMessage(bot, mockTextChannel(mockGuild(bot)), "test"));
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(sync_delete!.run).toHaveBeenCalled();
  });
});
