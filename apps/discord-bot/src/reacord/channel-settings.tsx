import { ChannelType, GuildForumTag, TextBasedChannel } from "discord.js";
import { Select, Option } from "reacord";
import React from "react";
import { ToggleButton } from "./components/toggle-button";

const getTagNameWithEmoji = (tag: GuildForumTag) =>
  tag.emoji?.name ? tag.emoji.name + " " + tag.name : tag.name;

export function ChannelSettingsMenu({ channel }: { channel: TextBasedChannel }) {
  const is_forum_channel = channel.isThread() && channel.parent?.type === ChannelType.GuildForum;
  const [indexingEnabled, setIndexingEnabled] = React.useState(false);
  return (
    <>
      <ToggleButton
        enable={indexingEnabled}
        disable_label={"Disable Indexing"}
        enable_label={"Enable Indexing"}
        setEnabled={setIndexingEnabled}
      />
      {is_forum_channel && (
        <Select>
          {channel.parent.availableTags.map((tag) => (
            <Option label={getTagNameWithEmoji(tag)} value={tag.id} key={tag.id} />
          ))}
        </Select>
      )}
    </>
  );
}
