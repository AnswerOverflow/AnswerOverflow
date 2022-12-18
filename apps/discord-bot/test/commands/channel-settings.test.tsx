import type { SapphireClient } from "@sapphire/framework";
import { Events, Interaction } from "discord.js";
import { mockInteracion } from "~test/utils/discordjs/interaction-mock";
import { createNormalScenario } from "~test/utils/discordjs/scenarios";
import { delay } from "~test/utils/helpers";

async function runCommand(client: SapphireClient, command: Interaction): Promise<Interaction> {
  let ran_interaction: Interaction | undefined;
  client.addListener(Events.InteractionCreate, (interaction: Interaction) => {
    ran_interaction = interaction;
  });
  client.emit(Events.InteractionCreate, command);
  while (!ran_interaction) {
    await delay();
  }
  await delay();
  return ran_interaction;
}

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

    await runCommand(client, command);
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

    await runCommand(client, command);
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

    await runCommand(client, command);
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
