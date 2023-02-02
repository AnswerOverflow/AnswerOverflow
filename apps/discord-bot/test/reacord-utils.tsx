import type { ReacordTester } from "@answeroverflow/reacord";
import { delay } from "@answeroverflow/discordjs-mock";
import type { ReactNode } from "react";
import { ephemeralReply } from "~discord-bot/utils/utils";

export async function reply(reacord: ReacordTester, content: ReactNode) {
  ephemeralReply(reacord, content);
  await delay();
  return reacord.messages[0];
}
