import { Client, Events, Guild, TextChannel } from "discord.js";
import { mockTextChannel } from "~discord-bot/test/utils/discordjs/channel-mock";
import { mockGuild } from "~discord-bot/test/utils/discordjs/guild-mock";
import { mockInteracion } from "~discord-bot/test/utils/discordjs/interaction-mock";
import {
  createGuildMemberVariants,
  setupBot,
  GuildMemberVariants,
  ScenarioData,
} from "~discord-bot/test/utils/discordjs/scenarios";
import { emitEvent } from "~discord-bot/test/utils/helpers";

let client: Client;
let data: ScenarioData;
let guild: Guild;
let members: GuildMemberVariants;
let text_channel: TextChannel;
beforeEach(async () => {
  data = await setupBot();
  client = data.client;
  guild = mockGuild(client);
  members = await createGuildMemberVariants(client);
  text_channel = mockTextChannel(client, guild);
});

describe("Channel Settings Slash Command", () => {
  it("uses /channel-settings without manage guild permissions", async () => {
    const command = mockInteracion(
      client,
      "channel-settings",
      "1048055954618454026",
      guild,
      text_channel,
      members.guild_member_default
    );
    command.reply = jest.fn();
    await emitEvent(client, Events.InteractionCreate, command);
    expect(command.reply).not.toHaveBeenCalled();
  });
  // it("uses /channel-settings as an admin", async () => { });
  // it("uses /channel-settings with manage guild permissions", async () => { });
  test.todo("Verify default member permissions");
  test.todo("Verify bot permissions");
  test.todo("Verify channel type");
  test.todo("Verify running in guild");
  test.todo("Verify error handling for missing permissions");
  test.todo("Verify error handling for backend");
  test.todo("Verify reacord reply is called with right args");
});
