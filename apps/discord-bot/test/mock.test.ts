// TODO: Write tests that validate each phase of the Sapphire input parsing to easily debug where mocked data fails

import { Events } from "@sapphire/framework";
import { ApplicationCommandType, InteractionType, PermissionsBitField } from "discord.js";
import type { RawInteractionData } from "discord.js/typings/rawDataTypes";
import { mockClient, mockInteracion } from "./mock";

describe("Mock tests", () => {
  it("should pass", async () => {
    const bot = mockClient();
    await bot.login("test");

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
    interaction.isChatInputCommand = () => true;

    const command_store = bot.stores.get("commands");
    console.log(interaction.commandId, interaction.commandName);
    const command =
      command_store.get(interaction.commandId) ?? command_store.get(interaction.commandName);
    expect(command).toBeDefined();

    let isPossibleChatInputCommand = false;
    bot.addListener(Events.PossibleChatInputCommand, () => {
      isPossibleChatInputCommand = true;
    });

    let unknownChatInputCommand = false;
    bot.addListener(Events.UnknownChatInputCommand, () => {
      unknownChatInputCommand = true;
    });

    bot.emit(Events.InteractionCreate, interaction);
    expect(isPossibleChatInputCommand).toBeTruthy();
    expect(unknownChatInputCommand).toBeFalsy();
  });
});
