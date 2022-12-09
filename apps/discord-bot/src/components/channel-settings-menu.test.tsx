import { getDefaultChannelSettings } from "@answeroverflow/api";
import { ReacordTester } from "@answeroverflow/reacord";
import { ChannelType } from "discord.js";

import React from "react";
import { mockClient, mockGuild, mockGuildMember, mockGuildChannel, mockUser } from "~test/mock";

import { ChannelSettingsMenu } from "./channel-settings-menu";

describe("ChannelSettingsMenu", () => {
  it("should render", async () => {
    const bot = mockClient();
    const guild_owner = mockUser(bot);
    const guild = mockGuild(bot, guild_owner);
    const member = mockGuildMember(bot, guild);
    const textChannel = mockGuildChannel(bot, guild, ChannelType.GuildText);
    textChannel.guild.members.fetch = vi.fn().mockReturnValue(member);

    expect(member).toBeDefined();
    expect(member.permissions.has("ManageGuild")).toBeDefined();

    const result = getDefaultChannelSettings("1");

    const reacord = new ReacordTester();
    const menu = <ChannelSettingsMenu channel={textChannel} settings={result} />;
    reacord.reply(menu);
    await new Promise((resolve) => setTimeout(resolve));
    const message = reacord.messages[0];
    expect(message).toBeDefined();

    const enable_indexing = message.findButtonByLabel("Enable Indexing", reacord);
    expect(enable_indexing).toBeDefined();
    await enable_indexing!.click();

    const disable_indexing = message.findButtonByLabel("Disable Indexing", reacord);
    expect(disable_indexing).toBeDefined();

    const not_found_enable_indexing = message.findButtonByLabel("Enable Indexing", reacord);
    expect(not_found_enable_indexing).toBeUndefined();

    await disable_indexing!.click();
    const not_found_disable_indexing = message.findButtonByLabel("Disable Indexing", reacord);
    expect(not_found_disable_indexing).toBeUndefined();
  });
});
