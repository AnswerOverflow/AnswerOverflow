import { Button, ButtonClickEvent } from "@answeroverflow/reacord";
import React from "react";

export function ToggleButton({
  currentlyEnabled,
  enableLabel,
  disableLabel,
  onClick,
  disabled = false,
}: {
  currentlyEnabled: boolean;
  enableLabel: string;
  disableLabel: string;
  disabled?: boolean;
  onClick: (event: ButtonClickEvent, enabled: boolean) => void;
}) {
  const label = currentlyEnabled ? disableLabel : enableLabel;
  const style = currentlyEnabled ? "danger" : "success";
  return (
    <Button
      label={label}
      disabled={disabled}
      style={disabled ? "secondary" : style}
      onClick={(event) => onClick(event, !currentlyEnabled)}
    />
  );
}
