import type { ReacordTester } from "@answeroverflow/reacord";
import { delay } from "@answeroverflow/discordjs-mock";
import type { ReactNode } from "react";
import { ephemeralReply } from "~discord-bot/utils/utils";
import type { GuildMember, TextChannel } from "discord.js";

export async function reply(reacord: ReacordTester, content: ReactNode) {
  ephemeralReply(reacord, content);
  await delay();
  return reacord.messages[0];
}

export function findLinkByURL(message: ReacordTester["messages"][number], url: string) {
  const items = message.options.actionRows.flatMap((row) => row);
  return items.find((item) => item.type === "link" && item.url === url);
}

export async function toggleButtonTest({
  clicker,
  preClickLabel,
  postClickLabel,
  message,
  reacord,
  channel,
}: {
  preClickLabel: string;
  postClickLabel: string;
  message: ReacordTester["messages"][number];
  clicker: GuildMember;
  reacord: ReacordTester;
  channel: TextChannel;
}) {
  const preClickButton = message.findButtonByLabel(preClickLabel, reacord);
  expect(preClickButton).toBeDefined();
  await preClickButton!.click(channel, clicker);

  // Used to verify no errors were thrown
  expect(reacord.messages).toHaveLength(1);

  const postClickButton = message.findButtonByLabel(postClickLabel, reacord);
  expect(postClickButton).toBeDefined();
}
