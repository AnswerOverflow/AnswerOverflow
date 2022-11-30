import { Button } from "reacord";
import React from "react";

export function ToggleButton({
  enable,
  enable_label,
  disable_label,
  setEnabled: setEnabled,
}: {
  enable: boolean;
  enable_label: string;
  disable_label: string;
  // eslint-disable-next-line no-unused-vars
  setEnabled: (enabled: boolean) => void;
}) {
  const label = enable ? enable_label : disable_label;
  const style = enable ? "success" : "danger";
  return (
    <Button
      label={label}
      style={style}
      onClick={() => {
        setEnabled(!enable);
      }}
    />
  );
}
