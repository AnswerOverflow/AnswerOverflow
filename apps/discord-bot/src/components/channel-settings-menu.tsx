import type { ChannelWithFlags, ChannelUpsertWithDepsInput } from "@answeroverflow/api";
import { callApiWithButtonErrorHandler } from "~discord-bot/utils/trpc";
import { type GuildForumTag, ChannelType, ForumChannel, GuildTextBasedChannel } from "discord.js";
import { ButtonClickEvent, Select, SelectChangeEvent, Option } from "@answeroverflow/reacord";
import React from "react";
import { ToggleButton } from "./toggle-button";
import { getRootChannel } from "~discord-bot/utils/utils";
import { toAOChannelWithServer } from "~discord-bot/utils/conversions";
import { createMemberCtx } from "~discord-bot/utils/context";

const getTagNameWithEmoji = (tag: GuildForumTag) =>
  tag.emoji?.name ? tag.emoji.name + " " + tag.name : tag.name;

const CLEAR_TAG_VALUE = "clear";

export function ChannelSettingsMenu({
  channel,
  settings,
}: {
  channel: GuildTextBasedChannel;
  settings: ChannelWithFlags;
}) {
  const [channelSettings, setChannelSettings] = React.useState<ChannelWithFlags>(settings);
  const is_forum_channel = channel.isThread() && channel.parent?.type == ChannelType.GuildForum;
  const target_channel = getRootChannel(channel);
  if (!target_channel) {
    throw new Error("Could not find root channel");
  }

  const updateChannelSettings = async (
    interaction: ButtonClickEvent,
    data: Omit<ChannelUpsertWithDepsInput, "id" | "server" | "type" | "name" | "parent_id">
  ) => {
    if (channel.isDMBased()) {
      interaction.ephemeralReply("Does not work in DMs");
      return;
    }

    const member = await channel.guild.members.fetch(interaction.user.id);
    await callApiWithButtonErrorHandler(
      {
        async ApiCall(router) {
          return await router.channels.upsertWithDeps({
            ...toAOChannelWithServer(target_channel),
            ...data,
          });
        },
        Ok(result) {
          setChannelSettings(result);
        },
        getCtx: () => createMemberCtx(member),
      },
      interaction
    );
  };

  const ToggleIndexingButton = () => (
    <ToggleButton
      currently_enabled={channelSettings.flags.indexing_enabled}
      disable_label={"Disable Indexing"}
      enable_label={"Enable Indexing"}
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onClick={async (interaction: ButtonClickEvent) => {
        const indexed_enabled = !channelSettings.flags.indexing_enabled;
        let new_invite_code: string | null = null;
        if (indexed_enabled) {
          const channel_invite = await target_channel.createInvite({
            maxAge: 0,
            maxUses: 0,
            reason: "Channel indexing enabled invite",
            unique: false,
            temporary: false,
          });
          new_invite_code = channel_invite.code;
        }
        void updateChannelSettings(interaction, {
          flags: {
            indexing_enabled: indexed_enabled,
          },
          invite_code: new_invite_code,
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

  const ToggleForumPostGuidelinesConsentButton = () => (
    <ToggleButton
      currently_enabled={channelSettings.flags.forum_guidelines_consent_enabled}
      disable_label={"Disable Forum Post Guidelines Consent"}
      enable_label={"Enable Forum Post Guidelines Consent"}
      onClick={(interaction: ButtonClickEvent) =>
        void updateChannelSettings(interaction, {
          flags: {
            forum_guidelines_consent_enabled:
              !channelSettings.flags.forum_guidelines_consent_enabled,
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
      {is_forum_channel && (
        <>
          <SelectMarkAsSolvedTag forum_channel={channel.parent} />
          <ToggleForumPostGuidelinesConsentButton />
        </>
      )}
    </>
  );
}
