import { Button, ButtonClickEvent } from "@answeroverflow/reacord";
import React from "react";

export function ToggleButton({
  currently_enabled,
  enable_label,
  disable_label,
  onClick,
}: {
  currently_enabled: boolean;
  enable_label: string;
  disable_label: string;
  // eslint-disable-next-line no-unused-vars
  onClick: (event: ButtonClickEvent) => void;
}) {
  const label = currently_enabled ? disable_label : enable_label;
  const style = currently_enabled ? "danger" : "success";
  return <Button label={label} style={style} onClick={onClick} />;
}
