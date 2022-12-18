import { createNormalScenario } from "~test/utils/discordjs/scenarios";
import { ChannelSettingsMenu } from "~components/channel-settings-menu";
import { reply } from "~test/utils/reacord/reacord-utils";
import React from "react";
import { getDefaultChannelSettings } from "@answeroverflow/api";

describe("ChannelSettingsMenu", () => {
  it("should render correctly in a text channel", async () => {
    const { reacord, text_channel } = await createNormalScenario();
    const default_settings = getDefaultChannelSettings(text_channel.id);
    const message = await reply(
      reacord,
      <ChannelSettingsMenu settings={default_settings} channel={text_channel} />
    );
    expect(
      message.hasComponents(
        ["Enable Indexing", "Enable Mark Solution", "Enable Send Mark Solution Instructions"],
        []
      )
    ).toBeTruthy();
  });
  it("should render correctly in a forum thread", async () => {
    const { reacord, forum_thread } = await createNormalScenario();
    const default_settings = getDefaultChannelSettings(forum_thread.parent!.id);
    const message = await reply(
      reacord,
      <ChannelSettingsMenu settings={default_settings} channel={forum_thread} />
    );
    expect(
      message.hasComponents(
        ["Enable Indexing", "Enable Mark Solution", "Enable Send Mark Solution Instructions"],
        ["Select a tag to use on mark as solved"]
      )
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

    expect(message.hasButton("Enable Indexing", reacord)).toBeFalsy();
    const button = message.findButtonByLabel("Disable Indexing", reacord);
    expect(button).toBeDefined();
  });
});

describe("Select mark solved tag", () => {
  it("should select a tag", async () => {
    const { reacord, forum_thread, forum_channel, guild_member_owner } =
      await createNormalScenario();
    const default_settings = getDefaultChannelSettings(forum_thread.parent!.id);
    const message = await reply(
      reacord,
      <ChannelSettingsMenu settings={default_settings} channel={forum_thread} />
    );
    const select = message.findSelectByPlaceholder(
      "Select a tag to use on mark as solved",
      reacord
    );
    expect(select).toBeDefined();
    await select?.select(forum_thread, guild_member_owner, forum_channel.availableTags[0].id);
    const select2 = message.findSelectByPlaceholder(
      "Select a tag to use on mark as solved",
      reacord
    );
    expect(select2?.values).toHaveLength(1);
    expect(select2!.values![0]).toBe(forum_channel.availableTags[0].id);
  });
});
