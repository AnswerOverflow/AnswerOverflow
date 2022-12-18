import type { ReacordTester } from "@answeroverflow/reacord";
import type { ReactNode } from "react";
import { ephemeralReply } from "~utils/utils";
import { delay } from "../helpers";

export async function reply(reacord: ReacordTester, content: ReactNode) {
  ephemeralReply(reacord, content);
  await delay();
  return reacord.messages[0];
}
