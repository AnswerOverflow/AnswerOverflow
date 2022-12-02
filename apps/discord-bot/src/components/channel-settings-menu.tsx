import type { ChannelSettingsOutput, ChannelSettingsUpsertInput } from "@answeroverflow/api";
import { makeMemberAPICaller, makeChannelUpsert } from "@utils/trpc";
import { type GuildForumTag, type TextBasedChannel, ChannelType, ForumChannel } from "discord.js";
import { ButtonClickEvent, Select, SelectChangeEvent, Option } from "reacord";
import React from "react";
import { ToggleButton } from "./toggle-button";

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
    const api = await makeMemberAPICaller(member);
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

  const ToggleIndexingButton = () => (
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
  );

  const ToggleMarkSolutionButton = () => (
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
  );

  const ToggleSendMarkSolutionInstructionsButton = () => (
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
  );

  const SelectMarkAsSolvedTag = ({ forum_channel }: { forum_channel: ForumChannel }) => (
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
        label={forum_channel.availableTags.length > 0 ? "(Clear)" : "No Tags Found"}
        value={CLEAR_TAG_VALUE}
      />
      {forum_channel.availableTags.map((tag) => (
        <Option label={getTagNameWithEmoji(tag)} value={tag.id} key={tag.id} />
      ))}
    </Select>
  );

  return (
    <>
      <ToggleIndexingButton />
      <ToggleMarkSolutionButton />
      <ToggleSendMarkSolutionInstructionsButton />
      {is_forum_channel && <SelectMarkAsSolvedTag forum_channel={channel.parent} />}
    </>
  );
}
