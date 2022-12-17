import { createNormalScenario } from "~test/utils/discordjs/scenarios";
import { ChannelSettingsMenu } from "~components/channel-settings-menu";
import { messageHasButton, messageHasSelectMenu, reply } from "~test/utils/reacord/reacord-utils";
import React from "react";
import { getDefaultChannelSettings } from "@answeroverflow/api";
import { delay } from "~test/utils/helpers";

describe("ChannelSettingsMenu", () => {
  it("should render correctly in a text channel", async () => {
    const { reacord, text_channel } = await createNormalScenario();
    const default_settings = getDefaultChannelSettings(text_channel.id);
    const message = await reply(
      reacord,
      <ChannelSettingsMenu settings={default_settings} channel={text_channel} />
    );
    expect(messageHasButton(message, "Enable Indexing", reacord)).toBeTruthy();
    expect(messageHasButton(message, "Enable Mark Solution", reacord)).toBeTruthy();
    expect(
      messageHasButton(message, "Enable Send Mark Solution Instructions", reacord)
    ).toBeTruthy();
    expect(
      messageHasSelectMenu(message, "Select a tag to use on mark as solved", reacord)
    ).toBeFalsy();
  });
  it("should render correctly in a forum thread", async () => {
    const { reacord, forum_thread } = await createNormalScenario();
    const default_settings = getDefaultChannelSettings(forum_thread.parent!.id);
    const message = await reply(
      reacord,
      <ChannelSettingsMenu settings={default_settings} channel={forum_thread} />
    );
    expect(messageHasButton(message, "Enable Indexing", reacord)).toBeTruthy();
    expect(messageHasButton(message, "Enable Mark Solution", reacord)).toBeTruthy();
    expect(
      messageHasButton(message, "Enable Send Mark Solution Instructions", reacord)
    ).toBeTruthy();
    expect(
      messageHasSelectMenu(message, "Select a tag to use on mark as solved", reacord)
    ).toBeTruthy();
  });
  test.todo("should render correctly in a text channel thread");
});

describe("Toggle Indexing Button", () => {
  it("should enable indexing", async () => {
    const { reacord, text_channel, guild_member_owner } = await createNormalScenario();
    const default_settings = getDefaultChannelSettings(text_channel.id);
    const message = await reply(
      reacord,
      <ChannelSettingsMenu settings={default_settings} channel={text_channel} />
    );
    const enable_indexing_button = message.findButtonByLabel("Enable Indexing", reacord);
    expect(enable_indexing_button).toBeDefined();
    await enable_indexing_button!.click(text_channel, guild_member_owner);
    await delay();
    await delay();
    await delay();
    await delay();
    expect(messageHasButton(message, "Enable Indexing", reacord)).toBeFalsy();
    const button = message.findButtonByLabel("Disable Indexing", reacord);
    expect(button).toBeDefined();
  });
});
