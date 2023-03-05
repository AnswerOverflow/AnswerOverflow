import { Button, Link } from "@answeroverflow/reacord";
import React from "react";
import { getMessageHistory } from "./router";

export const SupportMenu: React.FC = () => (
  <>
    <Link label="Docs" url="https://docs.answeroverflow.com" emoji="📃" />
    <Link
      label="Bugs, features & suggestions"
      url="https://github.com/answeroverflow/answeroverflow"
      emoji="<:github:860914920102166578>"
    />
    <Link
      label="Support server"
      url="https://discord.answeroverflow.com"
      emoji="<:discord:860914920215412756>"
    />
    <Link
      label="Schedule a call"
      url="https://cal.com/answeroverflow"
      emoji="<:calcom:1081058061038403614>"
    />
  </>
);

export const OpenSupportMenuButton: React.FC<{
  interactionId: string;
}> = ({ interactionId }) => (
  <Button
    onClick={(event) => {
      const replaceMenu = false;
      if (replaceMenu) {
        const { pushHistory } = getMessageHistory(interactionId);
        pushHistory(<SupportMenu />);
      } else {
        event.ephemeralReply(<SupportMenu />);
      }
    }}
    style="secondary"
    label="Support"
  />
);
