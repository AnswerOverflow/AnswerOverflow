import { Button, ReacordDiscordJs, ReacordTester, TestMessage } from "@answeroverflow/reacord";
import type { CommandInteraction } from "discord.js";
import type { ReactNode } from "react";
import React from "react";

export function messageHasButton(message: TestMessage, label: string, reacord: ReacordTester) {
  return message.findButtonByLabel(label, reacord) !== undefined;
}

export function ephemeralReply(
  reacord: ReacordTester | ReacordDiscordJs,
  content: ReactNode,
  interaction?: CommandInteraction
) {
  // TODO: Replace with instanceof this is ugly but instanceof isn't working with it.
  if (process.env.NODE_ENV === "test") {
    const reacordtest = reacord as ReacordTester;
    // <Button onClick={() => {}} label={"hi"} />
    reacordtest.ephemeralReply(content);
  } else if (interaction) {
    const reacordjs = reacord as ReacordDiscordJs;
    reacordjs.ephemeralReply(interaction, content);
  }
}
