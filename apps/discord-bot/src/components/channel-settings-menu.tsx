import type { ChannelWithFlags, ChannelUpsertWithDepsInput } from "@answeroverflow/api";
import { callAPI, makeComponentEventErrorHandler } from "~discord-bot/utils/trpc";
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
  const isForumChannel = channel.isThread() && channel.parent?.type == ChannelType.GuildForum;
  const targetChannel = getRootChannel(channel);
  if (!targetChannel) {
    throw new Error("Could not find root channel");
  }

  const updateChannelSettings = async (
    interaction: ButtonClickEvent,
    data: Omit<ChannelUpsertWithDepsInput, "id" | "server" | "type" | "name" | "parentId">
  ) => {
    if (channel.isDMBased()) {
      interaction.ephemeralReply("Does not work in DMs");
      return;
    }

    const member = await channel.guild.members.fetch(interaction.user.id);
    await callAPI({
      async apiCall(router) {
        return await router.channels.upsertWithDeps({
          ...toAOChannelWithServer(targetChannel),
          ...data,
        });
      },
      Ok(result) {
        setChannelSettings(result);
      },
      getCtx: () => createMemberCtx(member),
      ...makeComponentEventErrorHandler(interaction),
    });
  };

  const ToggleIndexingButton = () => (
    <ToggleButton
      currentlyEnabled={channelSettings.flags.indexingEnabled}
      disableLabel={"Disable Indexing"}
      enableLabel={"Enable Indexing"}
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onClick={async (interaction: ButtonClickEvent) => {
        const indexedEnabled = !channelSettings.flags.indexingEnabled;
        let newInviteCode: string | null = null;
        if (indexedEnabled) {
          const channelInvite = await targetChannel.createInvite({
            maxAge: 0,
            maxUses: 0,
            reason: "Channel indexing enabled invite",
            unique: false,
            temporary: false,
          });
          newInviteCode = channelInvite.code;
        }
        void updateChannelSettings(interaction, {
          flags: {
            indexingEnabled: indexedEnabled,
          },
          inviteCode: newInviteCode,
        });
      }}
    />
  );

  const ToggleMarkSolutionButton = () => (
    <ToggleButton
      currentlyEnabled={channelSettings.flags.markSolutionEnabled}
      disableLabel={"Disable Mark Solution"}
      enableLabel={"Enable Mark Solution"}
      onClick={(interaction: ButtonClickEvent) =>
        void updateChannelSettings(interaction, {
          flags: {
            markSolutionEnabled: !channelSettings.flags.markSolutionEnabled,
          },
        })
      }
    />
  );

  const ToggleForumPostGuidelinesConsentButton = () => (
    <ToggleButton
      currentlyEnabled={channelSettings.flags.forumGuidelinesConsentEnabled}
      disableLabel={"Disable Forum Post Guidelines Consent"}
      enableLabel={"Enable Forum Post Guidelines Consent"}
      onClick={(interaction: ButtonClickEvent) =>
        void updateChannelSettings(interaction, {
          flags: {
            forumGuidelinesConsentEnabled: !channelSettings.flags.forumGuidelinesConsentEnabled,
          },
        })
      }
    />
  );

  const ToggleSendMarkSolutionInstructionsButton = () => (
    <ToggleButton
      currentlyEnabled={channelSettings.flags.sendMarkSolutionInstructionsInNewThreads}
      disableLabel={"Disable Send Mark Solution Instructions"}
      enableLabel={"Enable Send Mark Solution Instructions"}
      onClick={(interaction: ButtonClickEvent) => {
        void updateChannelSettings(interaction, {
          flags: {
            sendMarkSolutionInstructionsInNewThreads:
              !channelSettings.flags.sendMarkSolutionInstructionsInNewThreads,
          },
        });
      }}
    />
  );

  const SelectMarkAsSolvedTag = ({ forumChannel }: { forumChannel: ForumChannel }) => (
    <Select
      placeholder="Select a tag to use on mark as solved"
      value={channelSettings.solutionTagId ?? ""}
      onChangeValue={(value: string, event: SelectChangeEvent) => {
        const newSolvedTag = value == CLEAR_TAG_VALUE ? null : value;
        void updateChannelSettings(event, {
          solutionTagId: newSolvedTag,
        });
      }}
    >
      <Option
        label={forumChannel.availableTags.length > 0 ? "(Clear)" : "No Tags Found"}
        value={CLEAR_TAG_VALUE}
      />
      {forumChannel.availableTags.map((tag) => (
        <Option label={getTagNameWithEmoji(tag)} value={tag.id} key={tag.id} />
      ))}
    </Select>
  );

  return (
    <>
      <ToggleIndexingButton />
      <ToggleMarkSolutionButton />
      <ToggleSendMarkSolutionInstructionsButton />
      {isForumChannel && (
        <>
          <SelectMarkAsSolvedTag forumChannel={channel.parent} />
          <ToggleForumPostGuidelinesConsentButton />
        </>
      )}
    </>
  );
}
