import { ChannelType, GuildForumTag, TextBasedChannel } from "discord.js";
import { Button, Select, Option } from "reacord";
import React from "react";

function ToggleButton({
  enable,
  label,
  setEnabled: setEnabled,
}: {
  enable: boolean;
  label: string;
  // eslint-disable-next-line no-unused-vars
  setEnabled: (enabled: boolean) => void;
}) {
  const label_prefix = enable ? "Enable" : "Disable";
  const style = enable ? "success" : "danger";
  return (
    <Button
      label={label_prefix + " " + label}
      style={style}
      onClick={() => {
        setEnabled(!enable);
      }}
    />
  );
}

const getTagNameWithEmoji = (tag: GuildForumTag) =>
  tag.emoji?.name ? tag.emoji.name + " " + tag.name : tag.name;

export function ChannelSettingsMenu({ channel }: { channel: TextBasedChannel }) {
  const is_forum_channel = channel.isThread() && channel.parent?.type === ChannelType.GuildForum;
  const [indexingEnabled, setIndexingEnabled] = React.useState(false);
  return (
    <>
      <ToggleButton enable={indexingEnabled} label={"Indexing"} setEnabled={setIndexingEnabled} />
      {is_forum_channel && (
        <Select multiple={true}>
          {channel.parent.availableTags.map((tag) => (
            <Option label={getTagNameWithEmoji(tag)} value={tag.id} />
          ))}
        </Select>
      )}
    </>
  );
}
