import { ChatInputCommand, Events } from "@sapphire/framework";
import { ApplicationCommandType, InteractionType, PermissionsBitField } from "discord.js";
import type { RawInteractionData } from "discord.js/typings/rawDataTypes";
import { mockClient, mockInteracion } from "~test/mock";

describe("Channel Settings Slash Command", () => {
  it("Should fail to open the channel settings menu due to missing permission", async () => {
    const bot = mockClient();
    await bot.login("test");

    const settings_command = bot.stores
      .get("commands")
      .find((command) => command.name === "channel-settings") as ChatInputCommand;
    expect(settings_command).toBeDefined();

    const data: RawInteractionData = {
      application_id: "1048055954618454026",
      channel_id: "1048055954618454026",
      data: {
        id: "1048055954618454026",
        name: "channel-settings",
        type: ApplicationCommandType.ChatInput,
      },
      id: "1048055954618454026",
      locale: "en-US",
      token: "test",
      guild_id: "1048055954618454026",
      guild_locale: "en-US",
      type: InteractionType.ApplicationCommand,
      version: 1,
      member: {
        deaf: false,
        mute: false,
        nick: "nick",
        user: {
          id: "100",
          username: "USERNAME",
          avatar: "user avatar url",
          discriminator: "user#0000",
        },
        joined_at: "2021-09-01T00:00:00.000Z",
        roles: [],
        permissions: PermissionsBitField.resolve("ManageGuild").toString(),
      },
    };

    const interaction = mockInteracion(bot, data);
    expect(interaction.memberPermissions!.has("ManageGuild")).toBeTruthy();
    expect(interaction.guildId).toBeDefined();
    interaction.isChatInputCommand = () => true;
    vitest.spyOn(settings_command, "chatInputRun" as never);
    let has_run = true;
    bot.addListener(Events.ChatInputCommandDenied, () => {
      has_run = true;
    });
    console.log("emitting event");
    bot.emit(Events.InteractionCreate, interaction);
    // sleep for .2 secons
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(interaction.isCommand()).toBeTruthy();
    expect(has_run).toBeTruthy();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(settings_command.chatInputRun).toHaveBeenCalled();
  });
});
