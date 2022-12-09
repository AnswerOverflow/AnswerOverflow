import { getDefaultChannelSettings } from "@answeroverflow/api";
import { ReacordTester } from "@answeroverflow/reacord";
import { ChannelType } from "discord.js";

import React from "react";
import {
  mockClient,
  mockGuild,
  mockGuildMember,
  mockGuildChannel,
  mockUser,
} from "~test/discordjs/mock";
import { messageHasButton } from "~test/reacord/reacord-test-utils";

import { ChannelSettingsMenu } from "./channel-settings-menu";

describe("ChannelSettingsMenu", () => {
  it("should render", async () => {
    const bot = mockClient();
    const guild_owner = mockUser(bot);
    const guild = mockGuild(bot, guild_owner);
    const member = mockGuildMember(bot, guild);
    const textChannel = mockGuildChannel(bot, guild, ChannelType.GuildText);
    textChannel.guild.members.fetch = vi.fn().mockReturnValue(member);

    const reacord = new ReacordTester();
    const settings = getDefaultChannelSettings("1");
    const menu = <ChannelSettingsMenu channel={textChannel} settings={settings} />;

    reacord.reply(menu);
    await new Promise((resolve) => setTimeout(resolve));
    const message = reacord.messages[0];
    expect(message).toBeDefined();

    const enable_indexing = message.findButtonByLabel("Enable Indexing", reacord);
    expect(enable_indexing).toBeDefined();
    await enable_indexing!.click();

    expect(messageHasButton(message, "Enable Indexing", reacord)).toBeFalsy();
    const disable_indexing = message.findButtonByLabel("Disable Indexing", reacord);
    expect(disable_indexing).toBeDefined();
    await disable_indexing!.click();

    expect(messageHasButton(message, "Disable Indexing", reacord)).toBeFalsy();
  });
});
