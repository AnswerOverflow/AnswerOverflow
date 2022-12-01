import type { ChannelSettingsOutput, ChannelSettingsUpsertInput } from "@answeroverflow/api";
import { ChannelType, GuildForumTag, TextBasedChannel } from "discord.js";
import { Select, Option, ButtonClickEvent, SelectChangeEvent } from "reacord";
import React from "react";
import { makeAPICaller, makeChannelUpsert } from "@trpc/create-caller";
import { ToggleButton } from "./components/toggle-button";

const getTagNameWithEmoji = (tag: GuildForumTag) =>
  tag.emoji?.name ? tag.emoji.name + " " + tag.name : tag.name;

const CLEAR_TAG_VALUE = "clear";

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
    data: ChannelSettingsUpsertInput["update"]
  ) => {
    if (channel.isDMBased()) {
      interaction.ephemeralReply("Does not work in DMs");
      return;
    }
    const member = await channel.guild.members.fetch(interaction.user.id);
    const api = await makeAPICaller(member.user, [
      {
        name: channel.guild.name,
        id: channel.guild.id,
        features: channel.guild.features,
        permissions: member.permissions.bitfield.toString(),
        icon: channel.guild.iconURL(),
        owner: channel.guild.ownerId === member.id,
      },
    ]);
    const updated_settings = await api.channel_settings.upsert({
      update: data,
      create: {
        channel: {
          ...makeChannelUpsert(channel, channel.guild),
        },
      },
    });
    setChannelSettings(updated_settings);
  };
  console.log(channelSettings.solution_tag_id);
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
      <ToggleButton
        enable={channelSettings.flags.mark_solution_enabled}
        disable_label={"Disable Mark Solution"}
        enable_label={"Enable Mark Solution"}
        onClick={(interaction: ButtonClickEvent) => {
          void updateChannelSettings(interaction, {
            flags: {
              mark_solution_enabled: !channelSettings.flags.mark_solution_enabled,
            },
          });
        }}
      />
      <ToggleButton
        enable={channelSettings.flags.send_mark_solution_instructions_in_new_threads}
        disable_label={"Disable Send Mark Solution Instructions"}
        enable_label={"Enable Send Mark Solution Instructions"}
        onClick={(interaction: ButtonClickEvent) => {
          void updateChannelSettings(interaction, {
            flags: {
              send_mark_solution_instructions_in_new_threads:
                !channelSettings.flags.send_mark_solution_instructions_in_new_threads,
            },
          });
        }}
      />
      {is_forum_channel && (
        <Select
          placeholder="Select a tag to use on mark as solved"
          value={channelSettings.solution_tag_id ?? ""}
          onChangeValue={(value: string, event: SelectChangeEvent) => {
            const new_solved_tag = value == CLEAR_TAG_VALUE ? null : value;
            void updateChannelSettings(event, {
              solution_tag_id: new_solved_tag,
            });
          }}
        >
          <Option
            label={channel.parent.availableTags.length > 0 ? "(Clear)" : "No Tags Found"}
            value={CLEAR_TAG_VALUE}
          />
          {channel.parent.availableTags.map((tag) => (
            <Option label={getTagNameWithEmoji(tag)} value={tag.id} key={tag.id} />
          ))}
        </Select>
      )}
    </>
  );
}
