import { Events } from "discord.js";
import { mockInteracion } from "~discord-bot/test/utils/discordjs/interaction-mock";
import { createNormalScenario } from "~discord-bot/test/utils/discordjs/scenarios";
import { emitEvent } from "~discord-bot/test/utils/helpers";

describe("Channel Settings Slash Command", () => {
  it("uses /channel-settings without manage guild permissions", async () => {
    const { client, guild, text_channel, guild_member_default } = await createNormalScenario();
    const command = mockInteracion(
      client,
      "channel-settings",
      "1048055954618454026",
      guild,
      text_channel,
      guild_member_default
    );
    const stored_command = client.stores
      .get("commands")
      .find((command) => command.name === "channel-settings");

    expect(stored_command).toBeDefined();
    jest.spyOn(stored_command!, "chatInputRun");
    await emitEvent(client, Events.InteractionCreate, command);
    expect(stored_command!.chatInputRun).not.toHaveBeenCalled();
  });
  it("uses /channel-settings as an admin", async () => {
    const { client, guild, text_channel, guild_member_admin } = await createNormalScenario();
    const command = mockInteracion(
      client,
      "channel-settings",
      "1048055954618454026",
      guild,
      text_channel,
      guild_member_admin
    );
    const stored_command = client.stores
      .get("commands")
      .find((command) => command.name === "channel-settings");

    expect(stored_command).toBeDefined();
    jest.spyOn(stored_command!, "chatInputRun");

    await emitEvent(client, Events.InteractionCreate, command);
    expect(stored_command!.chatInputRun).toHaveBeenCalled();
  });
  it("uses /channel-settings with manage guild permissions", async () => {
    const { client, guild, text_channel, guild_member_manage_guild } = await createNormalScenario();
    const command = mockInteracion(
      client,
      "channel-settings",
      "1048055954618454026",
      guild,
      text_channel,
      guild_member_manage_guild
    );
    const stored_command = client.stores
      .get("commands")
      .find((command) => command.name === "channel-settings");

    expect(stored_command).toBeDefined();
    jest.spyOn(stored_command!, "chatInputRun");

    await emitEvent(client, Events.InteractionCreate, command);
    expect(stored_command!.chatInputRun).toHaveBeenCalled();
  });
  test.todo("Verify default member permissions");
  test.todo("Verify bot permissions");
  test.todo("Verify channel type");
  test.todo("Verify running in guild");
  test.todo("Verify error handling for missing permissions");
  test.todo("Verify error handling for backend");
  test.todo("Verify reacord reply is called with right args");
});
