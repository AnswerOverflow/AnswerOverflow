// TODO: Write tests that validate each phase of the Sapphire input parsing to easily debug where mocked data fails

import { ChatInputCommand, Events } from "@sapphire/framework";
import {
  type APIChatInputApplicationCommandInteraction,
  ApplicationCommandType,
  InteractionType,
} from "discord.js";
import MockDiscord from "./mock";

describe("Mock tests", () => {
  it("should pass", async () => {
    const bot = new MockDiscord();
    await bot.client.login("test");

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

    const command_store = bot.client.stores.get("commands");
    console.log(interaction.commandId, interaction.commandName);
    const command =
      command_store.get(interaction.commandId) ?? command_store.get(interaction.commandName);
    expect(command).toBeDefined();

    let isPossibleChatInputCommand = false;
    bot.client.addListener(Events.PossibleChatInputCommand, () => {
      isPossibleChatInputCommand = true;
    });

    let unknownChatInputCommand = false;
    bot.client.addListener(Events.UnknownChatInputCommand, () => {
      unknownChatInputCommand = true;
    });

    bot.client.emit(Events.InteractionCreate, interaction);
    expect(isPossibleChatInputCommand).toBeTruthy();
    expect(unknownChatInputCommand).toBeFalsy();
  });
});
