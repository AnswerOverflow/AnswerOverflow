import { Button, ButtonClickEvent } from "reacord";
import React from "react";

export function ToggleButton({
  enable,
  enable_label,
  disable_label,
  onClick,
}: {
  enable: boolean;
  enable_label: string;
  disable_label: string;
  // eslint-disable-next-line no-unused-vars
  onClick: (event: ButtonClickEvent) => void;
}) {
  const label = enable ? enable_label : disable_label;
  const style = enable ? "success" : "danger";
  return <Button label={label} style={style} onClick={onClick} />;
}
