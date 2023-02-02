import { ChannelSettingsMenu } from "~discord-bot/components/channel-settings-menu";
import { reply } from "~discord-bot/test/reacord-utils";
import React from "react";
import { getDefaultChannelSettingsWithFlags } from "@answeroverflow/db";
import type { ReacordTester } from "@answeroverflow/reacord";
import type { ForumChannel, Guild, PublicThreadChannel, TextChannel } from "discord.js";
import { mockReacord, setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import {
  createGuildMemberVariants,
  GuildMemberVariants,
  mockForumChannel,
  mockGuild,
  mockPublicThread,
  mockTextChannel,
} from "@answeroverflow/discordjs-mock";

let reacord: ReacordTester;
let text_channel: TextChannel;
let forum_thread: PublicThreadChannel;
let forum_channel: ForumChannel;
let guild: Guild;
let members: GuildMemberVariants;
beforeEach(async () => {
  const client = await setupAnswerOverflowBot();
  reacord = mockReacord();
  guild = mockGuild(client);
  members = await createGuildMemberVariants(client, guild);
  text_channel = mockTextChannel(client, guild);
  forum_channel = mockForumChannel(client, guild);
  forum_thread = mockPublicThread({
    client,
    parent_channel: forum_channel,
  });
});

describe("ChannelSettingsMenu", () => {
  it("should render correctly in a text channel", async () => {
    const default_settings = getDefaultChannelSettingsWithFlags(text_channel.id);
    const message = await reply(
      reacord,
      <ChannelSettingsMenu settings={default_settings} channel={text_channel} />
    );
    expect(
      message!.hasComponents(
        ["Enable Indexing", "Enable Mark Solution", "Enable Send Mark Solution Instructions"],
        []
      )
    ).toBeTruthy();
  });
  it("should render correctly in a forum thread", async () => {
    const default_settings = getDefaultChannelSettingsWithFlags(forum_thread.parent!.id);
    const message = await reply(
      reacord,
      <ChannelSettingsMenu settings={default_settings} channel={forum_thread} />
    );
    expect(
      message!.hasComponents(
        [
          "Enable Indexing",
          "Enable Mark Solution",
          "Enable Send Mark Solution Instructions",
          "Enable Forum Post Guidelines Consent",
        ],
        ["Select a tag to use on mark as solved"]
      )
    ).toBeTruthy();
  });
  test.todo("should render correctly in a text channel thread");
});

describe("Toggle Indexing Button", () => {
  it("should enable indexing", async () => {
    const default_settings = getDefaultChannelSettingsWithFlags(text_channel.id);
    const message = await reply(
      reacord,
      <ChannelSettingsMenu settings={default_settings} channel={text_channel} />
    );
    const enable_indexing_button = message!.findButtonByLabel("Enable Indexing", reacord);
    expect(enable_indexing_button).toBeDefined();
    await enable_indexing_button!.click(text_channel, members.guild_member_owner);

    expect(message!.hasButton("Enable Indexing", reacord)).toBeFalsy();
    const button = message!.findButtonByLabel("Disable Indexing", reacord);
    expect(button).toBeDefined();
  });
  test.todo("Enable indexing in a category channel");
});

describe("Select mark solved tag", () => {
  it("should select a tag", async () => {
    const default_settings = getDefaultChannelSettingsWithFlags(forum_thread.parent!.id);
    const message = await reply(
      reacord,
      <ChannelSettingsMenu settings={default_settings} channel={forum_thread} />
    );
    const select = message!.findSelectByPlaceholder(
      "Select a tag to use on mark as solved",
      reacord
    );
    expect(select).toBeDefined();
    await select?.select(
      forum_thread,
      members.guild_member_owner,
      forum_channel.availableTags[0]!.id
    );
    const select2 = message!.findSelectByPlaceholder(
      "Select a tag to use on mark as solved",
      reacord
    );
    expect(select2?.values).toHaveLength(1);
    expect(select2!.values![0]).toBe(forum_channel.availableTags[0]!.id);
  });
});
