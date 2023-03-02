import type { ChannelWithFlags } from "@answeroverflow/api";
import { ChannelType, GuildTextBasedChannel } from "discord.js";
import { ButtonClickEvent, Button } from "@answeroverflow/reacord";
import React from "react";
import { getMessageHistory, ToggleButton } from "../primitives";
import { getRootChannel, RootChannel } from "~discord-bot/utils/utils";
import { guildOnlyComponentEvent } from "~discord-bot/utils/conditions";
import {
  updateChannelForumGuidelinesConsentEnabled,
  updateChannelIndexingEnabled,
} from "~discord-bot/domains/channel-settings";
import { componentEventStatusHandler } from "~discord-bot/utils/trpc";
import LRUCache from "lru-cache";
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

export const ENABLE_CHANNEL_INDEXING_LABEL = "Enable indexing";
export const DISABLE_CHANNEL_INDEXING_LABEL = "Disable indexing";
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
          Error: (error) => componentEventStatusHandler(event, error.message),
          Ok: (updatedChannel) => {
            updateChannelState(setChannel, updatedChannel);
          },
        });
      })
    }
  />
);

export const ENABLE_FORUM_GUIDELINES_CONSENT_LABEL = "Enable forum guidelines consent";
export const DISABLE_FORUM_GUIDELINES_CONSENT_LABEL = "Disable forum guidelines consent";
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
          Error: (error) => componentEventStatusHandler(event, error.message),
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
