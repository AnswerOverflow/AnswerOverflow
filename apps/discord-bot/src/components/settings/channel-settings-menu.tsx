import {
  type ButtonClickEvent,
  Button,
  Select,
  SelectChangeEvent,
  Option,
  Link,
  ActionRow,
} from "@answeroverflow/reacord";
import {
  ChannelType,
  ForumChannel,
  GuildForumTag,
  NewsChannel,
  TextChannel,
  type GuildTextBasedChannel,
} from "discord.js";
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
  SET_SOLVED_TAG_ID_PLACEHOLDER,
  DISABLE_AUTO_THREAD_LABEL,
  ENABLE_AUTO_THREAD_LABEL,
  ALLOWED_AUTO_THREAD_CHANNEL_TYPES,
  OPEN_HELP_CHANNEL_UTILITIES_LABEL,
  OPEN_EXPERIMENTAL_SETTINGS_LABEL,
  EXPERIMENTAL_SETTINGS_WAITLIST_URL,
  ENABLE_AI_QUESTION_IMPROVEMENT_SUGGESTIONS_LABEL,
  ENABLE_REDIRECTION_TO_HELP_CHANNEL_LABEL,
  ENABLE_AI_QUESTION_ANSWERING_LABEL,
} from "@answeroverflow/constants";
import type { ChannelWithFlags } from "@answeroverflow/prisma-types";
import React from "react";
import {
  ToggleButton,
  InstructionsContainer,
  EmbedMenuInstruction,
  getMessageHistory,
  Spacer,
} from "~discord-bot/components/primitives";
import {
  updateChannelIndexingEnabled,
  updateChannelForumGuidelinesConsentEnabled,
  updateMarkAsSolutionEnabled,
  updateSendMarkAsSolutionInstructionsEnabled,
  setSolutionTagId,
  updateAutoThreadEnabled,
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
  initialChannelData: ChannelWithFlags;
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

export function IndexingSettingsMenu({
  targetChannel,
  initialChannelData,
}: ChannelSettingsSubMenuProps) {
  const [channel, setChannel] = React.useState<ChannelWithFlags>(
    channelCache.get(targetChannel.id) ?? initialChannelData
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
      <Button
        label="Send consent prompt"
        style="primary"
        onClick={() => {
          console.log("sending consent prompt");
        }}
      />
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

export const CLEAR_TAG_VALUE = "clear";
const getTagNameWithEmoji = (tag: GuildForumTag) =>
  tag.emoji?.name ? `${tag.emoji.name} ${tag.name}` : tag.name;

function SelectMarkAsSolvedTag({
  channelInDB,
  setChannel,
  targetChannel,
}: ChannelSettingsMenuItemProps<ForumChannel>) {
  return (
    <Select
      placeholder={SET_SOLVED_TAG_ID_PLACEHOLDER}
      value={channelInDB.solutionTagId ?? ""}
      disabled={!channelInDB.flags.markSolutionEnabled}
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

function ToggleAutoThreadButton({
  channelInDB,
  setChannel,
  targetChannel,
}: ChannelSettingsMenuItemProps<TextChannel | NewsChannel>) {
  return (
    <ToggleButton
      currentlyEnabled={channelInDB.flags.autoThreadEnabled}
      disableLabel={DISABLE_AUTO_THREAD_LABEL}
      enableLabel={ENABLE_AUTO_THREAD_LABEL}
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onClick={async (event: ButtonClickEvent, enabled) =>
        guildOnlyComponentEvent(event, async ({ member }) => {
          await updateAutoThreadEnabled({
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

export function HelpChannelUtilitiesMenu({
  initialChannelData,
  targetChannel,
}: ChannelSettingsSubMenuProps) {
  const [channel, setChannel] = React.useState<ChannelWithFlags>(
    channelCache.get(targetChannel.id) ?? initialChannelData
  );
  const props = { channelInDB: channel, setChannel, targetChannel };
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
      <ToggleMarkAsSolutionButton {...props} />
      <ToggleSendMarkAsSolutionInstructionsButton {...props} />
      {ALLOWED_AUTO_THREAD_CHANNEL_TYPES.has(targetChannel.type) && (
        <ToggleAutoThreadButton
          channelInDB={channel}
          setChannel={setChannel}
          targetChannel={targetChannel as TextChannel | NewsChannel}
        />
      )}
      {targetChannel.type === ChannelType.GuildForum && (
        <SelectMarkAsSolvedTag
          channelInDB={channel}
          setChannel={setChannel}
          targetChannel={targetChannel}
        />
      )}
    </>
  );
}

function ExperimentalSettingsMenu() {
  return (
    <>
      <InstructionsContainer>
        **These features are experimental and may not work as expected.**
        <Spacer count={2} />
        **Some features may not be implemented yet, join the waitlist to be notified when they
        are.**
        <Spacer count={2} />
        <EmbedMenuInstruction
          instructions={[
            {
              title: ENABLE_REDIRECTION_TO_HELP_CHANNEL_LABEL,
              enabled: true,
              instructions:
                "Users will be redirected to use help channels when they ask a question in the wrong channel, i.e a general chat.",
            },
            {
              title: ENABLE_AI_QUESTION_ANSWERING_LABEL,
              enabled: true,
              instructions:
                "Users will receive a ChatGPT style AI answer to their question trained off your community's data.",
            },
            {
              title: ENABLE_AI_QUESTION_IMPROVEMENT_SUGGESTIONS_LABEL,
              enabled: true,
              instructions:
                "Users will receive instructions on how to improve their question to get a better answer.",
            },
          ]}
        />
      </InstructionsContainer>
      <Button
        label={ENABLE_REDIRECTION_TO_HELP_CHANNEL_LABEL}
        disabled={true}
        style="secondary"
        onClick={() => {
          console.error("Enable redirection to help channel not implemented yet");
        }}
      />
      <Button
        label={ENABLE_AI_QUESTION_ANSWERING_LABEL}
        disabled={true}
        style="secondary"
        onClick={() => {
          console.error("Enable AI Question Answering not implemented yet");
        }}
      />
      <Button
        label={ENABLE_AI_QUESTION_IMPROVEMENT_SUGGESTIONS_LABEL}
        disabled={true}
        style="secondary"
        onClick={() => {
          console.error("Enable AI Question Improvement Suggestions not implemented yet");
        }}
      />
      <ActionRow>
        <Link url={EXPERIMENTAL_SETTINGS_WAITLIST_URL} label="Join the waitlist" />
      </ActionRow>
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
      <InstructionsContainer>
        <EmbedMenuInstruction
          instructions={[
            {
              title: OPEN_HELP_CHANNEL_UTILITIES_LABEL,
              enabled: true,
              instructions: "Configure channel indexing and user consent settings.",
            },
            {
              title: OPEN_HELP_CHANNEL_UTILITIES_LABEL,
              enabled: true,
              instructions: "Configure utilities to improve asking questions.",
            },
          ]}
        />
      </InstructionsContainer>
      <Button
        label={OPEN_HELP_CHANNEL_UTILITIES_LABEL}
        style="primary"
        onClick={() => {
          const { pushHistory } = getMessageHistory(interactionId);
          pushHistory(
            <IndexingSettingsMenu initialChannelData={channel} targetChannel={targetChannel} />
          );
        }}
      />
      <Button
        label={OPEN_HELP_CHANNEL_UTILITIES_LABEL}
        style="primary"
        onClick={() => {
          const { pushHistory } = getMessageHistory(interactionId);
          pushHistory(
            <HelpChannelUtilitiesMenu initialChannelData={channel} targetChannel={targetChannel} />
          );
        }}
      />
      <Button
        label={OPEN_EXPERIMENTAL_SETTINGS_LABEL}
        style="primary"
        onClick={() => {
          const { pushHistory } = getMessageHistory(interactionId);
          pushHistory(<ExperimentalSettingsMenu />);
        }}
      />
    </>
  );
}
