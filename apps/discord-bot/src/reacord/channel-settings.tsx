import { Button, ButtonClickEvent } from "reacord";
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
      onClick={(buttonEvent: ButtonClickEvent) => {
        buttonEvent.reply("test");
        setEnabled(!enable);
      }}
    />
  );
}

export function ChannelSettingsMenu() {
  const [indexingEnabled, setIndexingEnabled] = React.useState(false);
  return (
    <ToggleButton enable={indexingEnabled} label={"Indexing"} setEnabled={setIndexingEnabled} />
  );
}
