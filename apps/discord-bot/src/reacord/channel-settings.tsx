import type { ChannelSettingsOutput, ChannelSettingsUpsertInput } from "@answeroverflow/api";
import { ChannelType, GuildForumTag, TextBasedChannel } from "discord.js";
import { Select, Option, ButtonClickEvent } from "reacord";
import React from "react";
import { makeAPICaller, makeChannelUpsert } from "@trpc/create-caller";
import { ToggleButton } from "./components/toggle-button";

const getTagNameWithEmoji = (tag: GuildForumTag) =>
  tag.emoji?.name ? tag.emoji.name + " " + tag.name : tag.name;

export function ChannelSettingsMenu({
  channel,
  settings,
}: {
  channel: TextBasedChannel;
  settings: ChannelSettingsOutput;
}) {
  const [channelSettings, setChannelSettings] = React.useState<ChannelSettingsOutput>(settings);
  const is_forum_channel = channel.isThread() && channel.parent?.type == ChannelType.GuildForum;

  const updateChannelSettings = async (
    interaction: ButtonClickEvent,
    data: ChannelSettingsUpsertInput["data"]
  ) => {
    const api = await makeAPICaller();

    if (channel.isDMBased()) {
      interaction.ephemeralReply("Does not work in DMs");
      return;
    }

    const updated_settings = await api.channel_settings.upsert({
      data: { ...data },
      channel: {
        ...makeChannelUpsert(channel, channel.guild),
      },
    });
    setChannelSettings(updated_settings);
  };

  return (
    <>
      <ToggleButton
        enable={channelSettings.flags.indexing_enabled}
        disable_label={"Disable Indexing"}
        enable_label={"Enable Indexing"}
        onClick={(interaction: ButtonClickEvent) => {
          void updateChannelSettings(interaction, {
            flags: {
              indexing_enabled: !channelSettings.flags.indexing_enabled,
            },
          });
        }}
      />
      {is_forum_channel && (
        <Select>
          {channel.parent.availableTags.map((tag) => (
            <Option label={getTagNameWithEmoji(tag)} value={tag.id} key={tag.id} />
          ))}
        </Select>
      )}
    </>
  );
}
