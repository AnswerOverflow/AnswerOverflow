import { Button, ButtonClickEvent } from "@answeroverflow/reacord";
import React from "react";

export function ToggleButton({
  currentlyEnabled,
  enableLabel,
  disableLabel,
  onClick,
}: {
  currentlyEnabled: boolean;
  enableLabel: string;
  disableLabel: string;
  onClick: (event: ButtonClickEvent, enabled: boolean) => void;
}) {
  const label = currentlyEnabled ? disableLabel : enableLabel;
  const style = currentlyEnabled ? "danger" : "success";
  return (
    <Button label={label} style={style} onClick={(event) => onClick(event, !currentlyEnabled)} />
  );
}
