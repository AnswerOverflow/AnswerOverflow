/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ChannelWithFlags } from "@answeroverflow/api";
import {
  type GuildForumTag,
  ChannelType,
  ForumChannel,
  GuildTextBasedChannel,
  Interaction,
} from "discord.js";
import {
  ButtonClickEvent,
  Select,
  SelectChangeEvent,
  Option,
  Button,
} from "@answeroverflow/reacord";
import React, { useContext } from "react";
import { ToggleButton } from "../primitives";
import { getRootChannel, RootChannel } from "~discord-bot/utils/utils";
import { getMessageHistory } from "../hooks";

const getTagNameWithEmoji = (tag: GuildForumTag) =>
  tag.emoji?.name ? tag.emoji.name + " " + tag.name : tag.name;

const CLEAR_TAG_VALUE = "clear";

type ChannelSettingsMenuItemProps = {
  channelInDB: ChannelWithFlags;
  setChannel: (channel: ChannelWithFlags) => void;
  targetChannel: RootChannel;
};

export const ENABLE_INDEXING_LABEL = "Enable indexing";
export const DISABLE_INDEXING_LABEL = "Disable indexing";

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
    onClick={async (interaction: ButtonClickEvent) => {
      const indexedEnabled = !channelInDB.flags.indexingEnabled;
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
    }}
  />
);

// const ToggleMarkSolutionButton = ({
//   channelInDB,
//   setChannel,
//   targetChannel,
// }: ChannelSettingsMenuItemProps) => (
//   <ToggleButton
//     currentlyEnabled={channelInDB.flags.markSolutionEnabled}
//     disableLabel={"Disable Mark Solution"}
//     enableLabel={"Enable Mark Solution"}
//     onClick={(interaction: ButtonClickEvent) => { }}
//   />
// );

// const ToggleForumPostGuidelinesConsentButton = ({
//   channelInDB,
//   setChannel,
//   targetChannel,
// }: ChannelSettingsMenuItemProps) => (
//   <ToggleButton
//     currentlyEnabled={channelInDB.flags.forumGuidelinesConsentEnabled}
//     disableLabel={"Disable Forum Post Guidelines Consent"}
//     enableLabel={"Enable Forum Post Guidelines Consent"}
//     onClick={(interaction: ButtonClickEvent) => { }}
//   />
// );

// const ToggleSendMarkSolutionInstructionsButton = ({
//   channelInDB,
//   setChannel,
//   targetChannel,
// }: ChannelSettingsMenuItemProps) => (
//   <ToggleButton
//     currentlyEnabled={channelInDB.flags.sendMarkSolutionInstructionsInNewThreads}
//     disableLabel={"Disable Send Mark Solution Instructions"}
//     enableLabel={"Enable Send Mark Solution Instructions"}
//     onClick={(interaction: ButtonClickEvent) => { }}
//   />
// );

// const SelectMarkAsSolvedTag = ({
//   channelInDB,
//   setChannel,
//   targetChannel,
// }: ChannelSettingsMenuItemProps & {
//   targetChannel: ForumChannel;
// }) => (
//   <Select
//     placeholder="Select a tag to use on mark as solved"
//     value={channelInDB.solutionTagId ?? ""}
//     onChangeValue={(value: string, event: SelectChangeEvent) => {
//       const newSolvedTag = value == CLEAR_TAG_VALUE ? null : value;
//     }}
//   >
//     <Option
//       label={targetChannel.availableTags.length > 0 ? "(Clear)" : "No Tags Found"}
//       value={CLEAR_TAG_VALUE}
//     />
//     {targetChannel.availableTags.map((tag) => (
//       <Option label={getTagNameWithEmoji(tag)} value={tag.id} key={tag.id} />
//     ))}
//   </Select>
// );

function IndexingSettingsMenu({
  channel,
  setChannel,
  targetChannel,
  interactionId,
}: {
  channel: ChannelWithFlags;
  setChannel: (channel: ChannelWithFlags) => void;
  targetChannel: RootChannel;
  interactionId: string;
}) {
  return (
    <>
      <ToggleIndexingButton
        channelInDB={channel}
        setChannel={setChannel}
        targetChannel={targetChannel}
      />
      <Button
        label="Channel Settings"
        onClick={() => {
          const { pushHistory } = getMessageHistory(interactionId);
          pushHistory(
            <MainMenu
              channel={channel}
              interactionId={interactionId}
              setChannel={setChannel}
              targetChannel={targetChannel}
            />
          );
        }}
      />
    </>
  );
}

function MainMenu({
  channel,
  setChannel,
  targetChannel,
  interactionId,
}: {
  channel: ChannelWithFlags;
  setChannel: (channel: ChannelWithFlags) => void;
  targetChannel: RootChannel;
  interactionId: string;
}) {
  return (
    <>
      <Button
        label="Indexing Settings"
        onClick={() => {
          const { pushHistory } = getMessageHistory(interactionId);
          pushHistory(
            <IndexingSettingsMenu
              channel={channel}
              interactionId={interactionId}
              setChannel={setChannel}
              targetChannel={targetChannel}
            />
          );
        }}
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
  const [channel, setChannel] = React.useState<ChannelWithFlags>(channelWithFlags);
  const isForumChannel =
    channelMenuIsIn.isThread() && channelMenuIsIn.parent?.type == ChannelType.GuildForum;
  const targetChannel = getRootChannel(channelMenuIsIn);
  if (!targetChannel) {
    throw new Error("Could not find root channel");
  }

  // Router takes in the base of what it renders
  // It then has a set active function
  // When calling set active, it pushes the old rendering to a stack
  // When calling set active, it renders the new rendering
  // When calling pop, it pops the old rendering off the stack and renders it
  console.log("Menu interaciton id", interactionId);
  return (
    <>
      <MainMenu
        channel={channelWithFlags}
        targetChannel={targetChannel}
        interactionId={interactionId}
        setChannel={setChannel}
      />
    </>
  );
}
