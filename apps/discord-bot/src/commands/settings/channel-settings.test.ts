import { ChatInputCommand, Events } from "@sapphire/framework";
import {
  APIChatInputApplicationCommandInteraction,
  ApplicationCommandType,
  InteractionType,
} from "discord.js";
import MockDiscord from "~test/mock";

describe("Channel Settings Slash Command", () => {
  it("Should open the channel settings menu", async () => {
    const bot = new MockDiscord();
    await bot.client.login("test");

    const settings_command = bot.client.stores
      .get("commands")
      .find((command) => command.name === "channel-settings") as ChatInputCommand;
    expect(settings_command).toBeDefined();

    const data: APIChatInputApplicationCommandInteraction = {
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
    };
    const interaction = bot.mockInteracion(data);
    interaction.isChatInputCommand = () => true;

    vitest.spyOn(settings_command, "chatInputRun" as never);
    let has_run = false;
    bot.client.addListener(Events.PossibleChatInputCommand, () => {
      has_run = true;
    });
    console.log("emitting event");
    bot.client.emit(Events.InteractionCreate, interaction);
    // sleep for .2 secons
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(interaction.isCommand()).toBeTruthy();
    expect(has_run).toBeTruthy();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(settings_command.chatInputRun).toHaveBeenCalledOnce();
  });
});
