import type {
  ChannelSettingsOutput,
  ChannelSettingsUpsertInput,
  ChannelSettingsUpsertWithDeps,
} from "@answeroverflow/api";
import { callApiWithButtonErrorHandler } from "~discord-bot/utils/trpc";
import { type GuildForumTag, type TextBasedChannel, ChannelType, ForumChannel } from "discord.js";
import { ButtonClickEvent, Select, SelectChangeEvent, Option } from "@answeroverflow/reacord";
import React from "react";
import { ToggleButton } from "./toggle-button";
import { getRootChannel, makeChannelUpsertWithDeps } from "~discord-bot/utils/utils";

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
    data: Omit<ChannelSettingsUpsertInput["update"], "channel_id">
  ) => {
    if (channel.isDMBased()) {
      interaction.ephemeralReply("Does not work in DMs");
      return;
    }

    const target_channel = getRootChannel(channel);
    if (!target_channel) {
      interaction.ephemeralReply("Could not find root channel");
      return;
    }

    const member = await channel.guild.members.fetch(interaction.user.id);
    await callApiWithButtonErrorHandler(
      {
        async ApiCall(router) {
          const upsert_data: ChannelSettingsUpsertWithDeps = {
            create: {
              channel: makeChannelUpsertWithDeps(target_channel),
              settings: {
                channel_id: target_channel.id,
                ...data,
              },
            },
            update: {
              channel_id: target_channel.id,
              ...data,
            },
          };
          return await router.channel_settings.upsertWithDeps(upsert_data);
        },
        Ok(result) {
          setChannelSettings(result);
        },
        member,
      },
      interaction
    );
  };

  const ToggleIndexingButton = () => (
    <ToggleButton
      currently_enabled={channelSettings.flags.indexing_enabled}
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
      currently_enabled={channelSettings.flags.mark_solution_enabled}
      disable_label={"Disable Mark Solution"}
      enable_label={"Enable Mark Solution"}
      onClick={(interaction: ButtonClickEvent) =>
        void updateChannelSettings(interaction, {
          flags: {
            mark_solution_enabled: !channelSettings.flags.mark_solution_enabled,
          },
        })
      }
    />
  );

  const ToggleSendMarkSolutionInstructionsButton = () => (
    <ToggleButton
      currently_enabled={channelSettings.flags.send_mark_solution_instructions_in_new_threads}
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
