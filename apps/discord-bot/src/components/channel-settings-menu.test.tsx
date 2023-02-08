import { ChannelSettingsMenu } from "~discord-bot/components/channel-settings-menu";
import { reply } from "~discord-bot/test/reacord-utils";
import React from "react";
import { getDefaultChannelWithFlags } from "@answeroverflow/db";
import type { ReacordTester } from "@answeroverflow/reacord";
import type { ForumChannel, Guild, PublicThreadChannel, TextChannel } from "discord.js";
import { mockReacord, setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import {
  createGuildMemberVariants,
  delay,
  GuildMemberVariants,
  mockForumChannel,
  mockGuild,
  mockPublicThread,
  mockTextChannel,
} from "@answeroverflow/discordjs-mock";
import { toAOChannel } from "~discord-bot/utils/conversions";

let reacord: ReacordTester;
let textChannel: TextChannel;
let forumThread: PublicThreadChannel;
let forumChannel: ForumChannel;
let guild: Guild;
let members: GuildMemberVariants;
beforeEach(async () => {
  const client = await setupAnswerOverflowBot();
  reacord = mockReacord();
  guild = mockGuild(client);
  members = await createGuildMemberVariants(client, guild);
  textChannel = mockTextChannel(client, guild);
  forumChannel = mockForumChannel(client, guild);
  forumThread = mockPublicThread({
    client,
    parentChannel: forumChannel,
  });
});

describe("ChannelSettingsMenu", () => {
  it("should render correctly in a text channel", async () => {
    const defaultSettings = getDefaultChannelWithFlags(toAOChannel(textChannel));
    const message = await reply(
      reacord,
      <ChannelSettingsMenu settings={defaultSettings} channel={textChannel} />
    );
    expect(
      message!.hasComponents(
        ["Enable Indexing", "Enable Mark Solution", "Enable Send Mark Solution Instructions"],
        []
      )
    ).toBeTruthy();
  });
  it("should render correctly in a forum thread", async () => {
    const defaultSettings = getDefaultChannelWithFlags(toAOChannel(forumThread.parent!));
    const message = await reply(
      reacord,
      <ChannelSettingsMenu settings={defaultSettings} channel={forumThread} />
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
    const defaultSettings = getDefaultChannelWithFlags(toAOChannel(textChannel));
    const message = await reply(
      reacord,
      <ChannelSettingsMenu settings={defaultSettings} channel={textChannel} />
    );
    const enableIndexingButton = message!.findButtonByLabel("Enable Indexing", reacord);
    expect(enableIndexingButton).toBeDefined();
    await enableIndexingButton!.click(textChannel, members.guildMemberOwner);
    await delay();
    expect(message!.hasButton("Enable Indexing", reacord)).toBeFalsy();
    const button = message!.findButtonByLabel("Disable Indexing", reacord);
    expect(button).toBeDefined();
  });
  test.todo("Enable indexing in a category channel");
});

describe("Select mark solved tag", () => {
  it("should select a tag", async () => {
    const defaultSettings = getDefaultChannelWithFlags(toAOChannel(forumThread.parent!));
    const message = await reply(
      reacord,
      <ChannelSettingsMenu settings={defaultSettings} channel={forumThread} />
    );
    await delay();

    const select = message!.findSelectByPlaceholder(
      "Select a tag to use on mark as solved",
      reacord
    );
    expect(select).toBeDefined();
    await select?.select(forumThread, members.guildMemberOwner, forumChannel.availableTags[0]!.id);
    const select2 = message!.findSelectByPlaceholder(
      "Select a tag to use on mark as solved",
      reacord
    );
    expect(select2?.values).toHaveLength(1);
    expect(select2!.values![0]).toBe(forumChannel.availableTags[0]!.id);
  });
});
