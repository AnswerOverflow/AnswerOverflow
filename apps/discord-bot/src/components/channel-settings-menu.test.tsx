import { getDefaultChannelSettings } from "@answeroverflow/api";
import { ReacordTester } from "@answeroverflow/reacord";

import React from "react";
import MockDiscord from "~test/mock";
import { ChannelSettingsMenu } from "./channel-settings-menu";

describe("ChannelSettingsMenu", () => {
  it("should render", async () => {
    const bot = new MockDiscord();
    const reacord = new ReacordTester();
    const result = getDefaultChannelSettings("1");
    expect(bot.guildMember.permissions).toBeDefined();
    expect(bot.guildMember.permissions.has("ManageGuild")).toBeDefined();
    bot.textChannel.guild.members.fetch = vi.fn().mockReturnValue(bot.guildMember);

    const menu = <ChannelSettingsMenu channel={bot.textChannel} settings={result} />;
    reacord.reply(menu);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const enable_indexing = await reacord.findButtonByLabel("Enable Indexing");
    const message = reacord.messages[0];

    expect(message).toBeDefined();
    expect(enable_indexing).toBeDefined();
    await enable_indexing!.click();
    // wait for a second
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const disable_indexing = await reacord.findButtonByLabel("Disable Indexing");
    expect(disable_indexing).toBeDefined();
  });
});
