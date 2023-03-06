import { mockChatInputCommandInteraction } from "@answeroverflow/discordjs-mock";
import type { ReactNode } from "react";
import type { Client, User } from "discord.js";
import { container } from "@sapphire/framework";
import { randomSnowflake } from "@answeroverflow/discordjs-utils";
import type { TestDiscordJSReactMessage } from "@answeroverflow/discordjs-react";

export async function reply(client: Client, content: ReactNode) {
  const interaction = mockChatInputCommandInteraction(client, "open", randomSnowflake().toString());
  const renderer = container.discordJSReact.ephemeralReply(interaction, content);

  // wait for message to not be undefined
  const msg = await new Promise<TestDiscordJSReactMessage>((resolve) => {
    const interval = setInterval(() => {
      const msg = renderer.message;
      if (msg !== undefined) {
        clearInterval(interval);
        resolve(msg as TestDiscordJSReactMessage);
      }
    }, 100);
  });
  return msg;
}

export async function toggleButtonTest({
  clicker,
  preClickLabel,
  postClickLabel,
  message,
}: {
  preClickLabel: string;
  postClickLabel: string;
  message: TestDiscordJSReactMessage;
  clicker: User;
}) {
  const preClickButton = message.findButtonByLabel(preClickLabel);
  expect(preClickButton).toBeDefined();
  await preClickButton!.click({ clicker });
  // TODO: Verify no errors were thrown
  const postClickButton = message.findButtonByLabel(postClickLabel);
  expect(postClickButton).toBeDefined();
  return postClickButton;
}
