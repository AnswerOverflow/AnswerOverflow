import { Button, Link } from "@answeroverflow/discordjs-react";
import { delay } from "@answeroverflow/discordjs-mock";
import React from "react";
import { getMessageHistory } from "./router";
import { ephemeralReply } from "~discord-bot/utils/utils";

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
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    onClick={async (interaction) => {
      await delay(4000);
      const replaceMenu = false;
      if (replaceMenu) {
        const { pushHistory } = getMessageHistory(interactionId);
        pushHistory(<SupportMenu />);
      } else {
        ephemeralReply(<SupportMenu />, interaction);
      }
    }}
    style="Secondary"
    label="Support"
  />
);
