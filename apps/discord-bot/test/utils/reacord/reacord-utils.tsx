import { ReacordDiscordJs, ReacordTester, TestMessage } from "@answeroverflow/reacord";
import type { CommandInteraction } from "discord.js";
import type { ReactNode } from "react";

export function messageHasButton(message: TestMessage, label: string, reacord: ReacordTester) {
  return message.findButtonByLabel(label, reacord) !== undefined;
}

export function ephemeralReply(
  reacord: ReacordTester | ReacordDiscordJs,
  content: ReactNode,
  interaction?: CommandInteraction
) {
  if (reacord instanceof ReacordTester) {
    reacord.ephemeralReply(content);
    return;
  } else if (interaction && reacord instanceof ReacordDiscordJs) {
    reacord.ephemeralReply(interaction, content);
    return;
  }
  throw new Error(`Invalid reacord instance`);
}
