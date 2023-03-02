import type { ChannelWithFlags } from "@answeroverflow/api";
import type { GuildTextBasedChannel } from "discord.js";
import { ButtonClickEvent, Button } from "@answeroverflow/reacord";
import React from "react";
import { getMessageHistory, ToggleButton } from "../primitives";
import { getRootChannel, RootChannel } from "~discord-bot/utils/utils";
import { guildOnlyComponentEvent } from "~discord-bot/utils/conditions";
import { updateChannelIndexingEnabled } from "~discord-bot/domains/channel-settings";
import { componentEventStatusHandler } from "~discord-bot/utils/trpc";
import LRUCache from "lru-cache";
type ChannelSettingsMenuItemProps = {
  channelInDB: ChannelWithFlags;
  setChannel: (channel: ChannelWithFlags) => void;
  targetChannel: RootChannel;
};

export const ENABLE_INDEXING_LABEL = "Enable indexing";
export const DISABLE_INDEXING_LABEL = "Disable indexing";

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

const ToggleIndexingButton = ({
  channelInDB,
  setChannel,
  targetChannel,
}: ChannelSettingsMenuItemProps) => (
  <ToggleButton
    currentlyEnabled={channelInDB.flags.indexingEnabled}
    disableLabel={"Disable Indexing"}
    enableLabel={"Enable Indexing"}
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

function IndexingSettingsMenu({
  targetChannel,
  channelWithFlags,
}: {
  channelWithFlags: ChannelWithFlags;
  targetChannel: RootChannel;
}) {
  const [channel, setChannel] = React.useState<ChannelWithFlags>(
    channelCache.get(targetChannel.id) ?? channelWithFlags
  );
  return (
    <>
      <ToggleIndexingButton
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
