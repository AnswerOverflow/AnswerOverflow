import type { ChatInputCommand } from "@sapphire/framework";
import { ChannelType, Events } from "discord.js";
import {
  mockClient,
  mockGuild,
  mockGuildChannel,
  mockSlashCommand,
  mockUser,
} from "~test/discordjs/mock";

describe("Channel Settings Slash Command", () => {
  it("Should fail to open the channel settings menu due to missing permission", async () => {
    const bot = mockClient();
    await bot.login();
    const settings_command = bot.stores
      .get("commands")
      .find((command) => command.name === "channel-settings") as ChatInputCommand;
    const user = mockUser(bot);
    const guild = mockGuild(bot, user);
    const text_channel = mockGuildChannel(bot, guild, ChannelType.GuildText);

    const interaction = mockSlashCommand({
      channel: text_channel,
      client: bot,
      guild,
      permissions: ["ManageGuild"],
      data: {
        id: "1048055954618454026",
        name: "channel-settings",
      },
    });
    expect(settings_command).toBeDefined();
    vitest.spyOn(settings_command, "chatInputRun" as never);

    bot.emit(Events.InteractionCreate, interaction);
    // sleep for .2 secons
    await new Promise((resolve) => setTimeout(resolve, 200));

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(settings_command.chatInputRun).toHaveBeenCalled();
  });
});
