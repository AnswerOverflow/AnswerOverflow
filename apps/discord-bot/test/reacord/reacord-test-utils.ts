import { ReacordTester, TestMessage } from "@answeroverflow/reacord";

export function messageHasButton(message: TestMessage, label: string, reacord: ReacordTester) {
  return message.findButtonByLabel(label, reacord) !== undefined;
}
