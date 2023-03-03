import { type ButtonClickEvent, Button } from "@answeroverflow/reacord";
import { ChannelType, type GuildTextBasedChannel } from "discord.js";
import LRUCache from "lru-cache";
import {
  DISABLE_CHANNEL_INDEXING_LABEL,
  ENABLE_CHANNEL_INDEXING_LABEL,
  DISABLE_FORUM_GUIDELINES_CONSENT_LABEL,
  ENABLE_FORUM_GUIDELINES_CONSENT_LABEL,
  ENABLE_INDEXING_LABEL,
  FORUM_GUIDELINES_CONSENT_PROMPT,
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
} from "~discord-bot/domains/channel-settings";
import { guildOnlyComponentEvent } from "~discord-bot/utils/conditions";
import { componentEventStatusHandler } from "~discord-bot/utils/trpc";
import { type RootChannel, getRootChannel } from "~discord-bot/utils/utils";

type ChannelSettingsMenuItemProps = {
  channelInDB: ChannelWithFlags;
  setChannel: (channel: ChannelWithFlags) => void;
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

const ToggleIndexingButton = ({
  channelInDB,
  setChannel,
  targetChannel,
}: ChannelSettingsMenuItemProps) => (
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

const ToggleForumGuidelinesConsentButton = ({
  channelInDB,
  setChannel,
  targetChannel,
}: ChannelSettingsMenuItemProps) => (
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

export function IndexingSettingsMenu({
  targetChannel,
  channelWithFlags,
}: {
  channelWithFlags: ChannelWithFlags;
  targetChannel: RootChannel;
}) {
  const [channel, setChannel] = React.useState<ChannelWithFlags>(
    channelCache.get(targetChannel.id) ?? channelWithFlags
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
          pushHistory(
            <IndexingSettingsMenu channelWithFlags={channel} targetChannel={targetChannel} />
          );
        }}
      />
    </>
  );
}
