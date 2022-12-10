import { ChannelType } from "discord.js";
import {
  mockClient,
  mockGuild,
  mockMessage,
  mockGuildChannel,
  mockUser,
} from "~test/discordjs/mock";

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
    jest.spyOn(sync_delete!, "run");
    bot.emit(
      "messageDelete",
      mockMessage(bot, mockGuildChannel(bot, mockGuild(bot, mockUser(bot)), ChannelType.GuildText))
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(sync_delete!.run).toHaveBeenCalled();
  });
});
