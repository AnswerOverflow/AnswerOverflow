import {
  type ButtonClickEvent,
  Button,
  Select,
  SelectChangeEvent,
  Option,
} from "@answeroverflow/reacord";
import { ChannelType, ForumChannel, GuildForumTag, type GuildTextBasedChannel } from "discord.js";
import LRUCache from "lru-cache";
import {
  DISABLE_CHANNEL_INDEXING_LABEL,
  ENABLE_CHANNEL_INDEXING_LABEL,
  DISABLE_FORUM_GUIDELINES_CONSENT_LABEL,
  ENABLE_FORUM_GUIDELINES_CONSENT_LABEL,
  ENABLE_INDEXING_LABEL,
  FORUM_GUIDELINES_CONSENT_PROMPT,
  DISABLE_MARK_AS_SOLUTION_LABEL,
  ENABLE_MARK_AS_SOLUTION_LABEL,
  DISABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL,
  ENABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL,
} from "@answeroverflow/constants";
import type { ChannelWithFlags } from "@answeroverflow/prisma-types";
import React from "react";
import {
  ToggleButton,
  InstructionsContainer,
  EmbedMenuInstruction,
  getMessageHistory,
} from "~discord-bot/components/primitives";
import {
  updateChannelIndexingEnabled,
  updateChannelForumGuidelinesConsentEnabled,
  updateMarkAsSolutionEnabled,
  updateSendMarkAsSolutionInstructionsEnabled,
  setSolutionTagId,
} from "~discord-bot/domains/channel-settings";
import { guildOnlyComponentEvent } from "~discord-bot/utils/conditions";
import { componentEventStatusHandler } from "~discord-bot/utils/trpc";
import { type RootChannel, getRootChannel } from "~discord-bot/utils/utils";

type ChannelSettingsMenuItemProps<T extends RootChannel = RootChannel> = {
  channelInDB: ChannelWithFlags;
  setChannel: (channel: ChannelWithFlags) => void;
  targetChannel: T;
};

type ChannelSettingsSubMenuProps = {
  channelInDB: ChannelWithFlags;
  targetChannel: RootChannel;
};

// Store a cache to handle unmounting of the component
const channelCache = new LRUCache<string, ChannelWithFlags>({
  max: 500,
  ttl: 1000 * 60 * 5,
});

const updateChannelState = (
  setChannelState: (channel: ChannelWithFlags) => void,
  channel: ChannelWithFlags
) => {
  channelCache.set(channel.id, channel);
  setChannelState(channel);
};

/*
  Indexing Menu
*/

function ToggleIndexingButton({
  channelInDB,
  setChannel,
  targetChannel,
}: ChannelSettingsMenuItemProps) {
  return (
    <ToggleButton
      currentlyEnabled={channelInDB.flags.indexingEnabled}
      disableLabel={DISABLE_CHANNEL_INDEXING_LABEL}
      enableLabel={ENABLE_CHANNEL_INDEXING_LABEL}
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onClick={async (event: ButtonClickEvent, enabled) =>
        guildOnlyComponentEvent(event, async ({ member }) => {
          await updateChannelIndexingEnabled({
            channel: targetChannel,
            enabled,
            member,
            Error: (message) => componentEventStatusHandler(event, message),
            Ok: (updatedChannel) => {
              updateChannelState(setChannel, updatedChannel);
            },
          });
        })
      }
    />
  );
}

function ToggleForumGuidelinesConsentButton({
  channelInDB,
  setChannel,
  targetChannel,
}: ChannelSettingsMenuItemProps) {
  return (
    <ToggleButton
      currentlyEnabled={channelInDB.flags.forumGuidelinesConsentEnabled}
      disableLabel={DISABLE_FORUM_GUIDELINES_CONSENT_LABEL}
      enableLabel={ENABLE_FORUM_GUIDELINES_CONSENT_LABEL}
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onClick={async (event: ButtonClickEvent, enabled) =>
        guildOnlyComponentEvent(event, async ({ member }) => {
          await updateChannelForumGuidelinesConsentEnabled({
            channel: targetChannel,
            enabled,
            member,
            Error: (message) => componentEventStatusHandler(event, message),
            Ok: (updatedChannel) => {
              updateChannelState(setChannel, updatedChannel);
            },
          });
        })
      }
    />
  );
}

export function IndexingSettingsMenu({ targetChannel, channelInDB }: ChannelSettingsSubMenuProps) {
  const [channel, setChannel] = React.useState<ChannelWithFlags>(
    channelCache.get(targetChannel.id) ?? channelInDB
  );
  const isButtonInForumChannel = targetChannel.type === ChannelType.GuildForum;
  return (
    <>
      <InstructionsContainer>
        <EmbedMenuInstruction
          instructions={[
            {
              title: ENABLE_INDEXING_LABEL,
              enabled: !channel.flags.indexingEnabled,
              instructions: "This channel will be indexed and searchable.",
            },
            {
              title: DISABLE_CHANNEL_INDEXING_LABEL,
              enabled: channel.flags.indexingEnabled,
              instructions: "This channel will not be indexed and searchable.",
            },
            {
              title: ENABLE_FORUM_GUIDELINES_CONSENT_LABEL,
              enabled: !channel.flags.forumGuidelinesConsentEnabled && isButtonInForumChannel,
              instructions: `Users posting new threads in this channel will be marked as consenting. You must have the following in your post guidelines for this to work:\n\n\`${FORUM_GUIDELINES_CONSENT_PROMPT}\``,
            },
            {
              title: DISABLE_FORUM_GUIDELINES_CONSENT_LABEL,
              enabled: channel.flags.forumGuidelinesConsentEnabled && isButtonInForumChannel,
              instructions:
                "Users posting new threads in this channel will not be marked as consenting.",
            },
          ]}
        />
      </InstructionsContainer>
      <ToggleIndexingButton
        channelInDB={channel}
        setChannel={setChannel}
        targetChannel={targetChannel}
      />
      {isButtonInForumChannel && (
        <ToggleForumGuidelinesConsentButton
          channelInDB={channel}
          setChannel={setChannel}
          targetChannel={targetChannel}
        />
      )}
    </>
  );
}

/*
  Help Channel Utilities Menu
*/

function ToggleMarkAsSolutionButton({
  channelInDB,
  setChannel,
  targetChannel,
}: ChannelSettingsMenuItemProps) {
  return (
    <ToggleButton
      currentlyEnabled={channelInDB.flags.markSolutionEnabled}
      disableLabel={DISABLE_MARK_AS_SOLUTION_LABEL}
      enableLabel={ENABLE_MARK_AS_SOLUTION_LABEL}
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onClick={async (event: ButtonClickEvent, enabled) =>
        guildOnlyComponentEvent(event, async ({ member }) => {
          await updateMarkAsSolutionEnabled({
            channel: targetChannel,
            enabled,
            member,
            Error: (message) => componentEventStatusHandler(event, message),
            Ok: (updatedChannel) => {
              updateChannelState(setChannel, updatedChannel);
            },
          });
        })
      }
    />
  );
}

function ToggleSendMarkAsSolutionInstructionsButton({
  channelInDB,
  setChannel,
  targetChannel,
}: ChannelSettingsMenuItemProps) {
  return (
    <ToggleButton
      currentlyEnabled={channelInDB.flags.sendMarkSolutionInstructionsInNewThreads}
      disableLabel={DISABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL}
      enableLabel={ENABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL}
      disabled={!channelInDB.flags.markSolutionEnabled}
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onClick={async (event: ButtonClickEvent, enabled) =>
        guildOnlyComponentEvent(event, async ({ member }) => {
          await updateSendMarkAsSolutionInstructionsEnabled({
            channel: targetChannel,
            enabled,
            member,
            Error: (message) => componentEventStatusHandler(event, message),
            Ok: (updatedChannel) => {
              updateChannelState(setChannel, updatedChannel);
            },
          });
        })
      }
    />
  );
}

const CLEAR_TAG_VALUE = "clear";
const getTagNameWithEmoji = (tag: GuildForumTag) =>
  tag.emoji?.name ? `${tag.emoji.name} ${tag.name}` : tag.name;

function SelectMarkAsSolvedTag({
  channelInDB,
  setChannel,
  targetChannel,
}: ChannelSettingsMenuItemProps<ForumChannel>) {
  return (
    <Select
      placeholder="Select a tag to use on mark as solved"
      value={channelInDB.solutionTagId ?? ""}
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onChangeValue={async (value: string, event: SelectChangeEvent) =>
        guildOnlyComponentEvent(event, async ({ member }) =>
          setSolutionTagId({
            channel: targetChannel,
            tagId: value === CLEAR_TAG_VALUE ? null : value,
            member,
            Error: (message) => componentEventStatusHandler(event, message),
            Ok: (updatedChannel) => {
              updateChannelState(setChannel, updatedChannel);
            },
          })
        )
      }
    >
      <Option
        label={targetChannel.availableTags.length > 0 ? "(Clear)" : "No Tags Found"}
        value={CLEAR_TAG_VALUE}
      />
      {targetChannel.availableTags.map((tag) => (
        <Option label={getTagNameWithEmoji(tag)} value={tag.id} key={tag.id} />
      ))}
    </Select>
  );
}

export function HelpChannelUtilitiesMenu({
  channelInDB,
  targetChannel,
}: ChannelSettingsSubMenuProps) {
  const [channel, setChannel] = React.useState<ChannelWithFlags>(
    channelCache.get(targetChannel.id) ?? channelInDB
  );
  return (
    <>
      <InstructionsContainer>
        <EmbedMenuInstruction
          instructions={[
            {
              title: ENABLE_MARK_AS_SOLUTION_LABEL,
              enabled: !channel.flags.markSolutionEnabled,
              instructions: "Users will be able to mark their own messages as solutions.",
            },
            {
              title: DISABLE_MARK_AS_SOLUTION_LABEL,
              enabled: channel.flags.markSolutionEnabled,
              instructions: "Users will not be able to mark their own messages as solutions.",
            },
          ]}
        />
      </InstructionsContainer>
      <ToggleMarkAsSolutionButton
        channelInDB={channel}
        setChannel={setChannel}
        targetChannel={targetChannel}
      />
      <ToggleSendMarkAsSolutionInstructionsButton
        channelInDB={channel}
        setChannel={setChannel}
        targetChannel={targetChannel}
      />
    </>
  );
}

export function ChannelSettingsMenu({
  channelMenuIsIn,
  channelWithFlags,
  interactionId,
}: {
  channelMenuIsIn: GuildTextBasedChannel;
  channelWithFlags: ChannelWithFlags;
  interactionId: string;
}) {
  const [channel] = React.useState<ChannelWithFlags>(
    channelCache.get(channelMenuIsIn.id) ?? channelWithFlags
  );
  const targetChannel = getRootChannel(channelMenuIsIn);
  if (!targetChannel) {
    throw new Error("Could not find root channel");
  }
  return (
    <>
      <Button
        label="Indexing Settings"
        style="primary"
        onClick={() => {
          const { pushHistory } = getMessageHistory(interactionId);
          pushHistory(<IndexingSettingsMenu channelInDB={channel} targetChannel={targetChannel} />);
        }}
      />
      <Button
        label="Help Channel Utilities"
        style="primary"
        onClick={() => {
          const { pushHistory } = getMessageHistory(interactionId);
          pushHistory(
            <HelpChannelUtilitiesMenu channelInDB={channel} targetChannel={targetChannel} />
          );
        }}
      />
    </>
  );
}
