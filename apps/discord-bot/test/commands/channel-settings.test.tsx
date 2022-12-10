import type { ChatInputCommand } from "@sapphire/framework";
import { ChannelType, Events } from "discord.js";

import {
  mockClient,
  mockGuild,
  mockGuildChannel,
  mockReacord,
  mockSlashCommand,
  mockUser,
} from "~test/discordjs/mock";

describe("Channel Settings Slash Command", () => {
  it("Should fail to open the channel settings menu due to missing permission", async () => {
    const bot = mockClient();
    await bot.login();
    const reacord = mockReacord();
    await new Promise((resolve) => setTimeout(resolve));

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
    vi.spyOn(settings_command, "chatInputRun");
    vi.spyOn(reacord, "ephemeralReply");

    expect(settings_command).toBeDefined();

    // const menu = (
    //   <ChannelSettingsMenu channel={text_channel} settings={getDefaultChannelSettings("1")} />
    // );
    // ephemeralReply(reacord, menu, interaction);

    bot.emit(Events.InteractionCreate, interaction);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(settings_command.chatInputRun).toHaveBeenCalled();
  });
});
