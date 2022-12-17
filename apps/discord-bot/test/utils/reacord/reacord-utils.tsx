import type { ReacordTester, TestMessage } from "@answeroverflow/reacord";
import type { ReactNode } from "react";
import { ephemeralReply } from "~utils/utils";
import { delay } from "../helpers";

export function messageHasButton(message: TestMessage, label: string, reacord: ReacordTester) {
  return message.findButtonByLabel(label, reacord) !== undefined;
}

export function messageHasSelectMenu(
  message: TestMessage,
  placeholder: string,
  reacord: ReacordTester
) {
  return message.findSelectByPlaceholder(placeholder, reacord) !== undefined;
}

export async function reply(reacord: ReacordTester, content: ReactNode) {
  ephemeralReply(reacord, content);
  await delay();
  return reacord.messages[0];
}
