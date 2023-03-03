import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Events, Message } from "discord.js";
import { findChannelById } from "@answeroverflow/db";
import { isHumanMessage, removeDiscordMarkdown } from "~discord-bot/utils/utils";
import { ALLOWED_AUTO_THREAD_CHANNEL_TYPES } from "@answeroverflow/constants";

@ApplyOptions<Listener.Options>({ event: Events.MessageCreate })
export class OnMessage extends Listener {
  public async run(message: Message) {
    const channelType = message.channel.type;

    if (!ALLOWED_AUTO_THREAD_CHANNEL_TYPES.has(channelType)) return;
    if (!isHumanMessage(message)) return;

    // Channel is text based, and message has been sent by a human

    const channel = await findChannelById(message.channelId);
    if (!channel?.flags.autoThreadEnabled) return;
    let textTitle = `${message.member?.nickname ?? message.author.username} - ${
      message.cleanContent
    }`;
    // Remove all markdown characters
    textTitle = removeDiscordMarkdown(textTitle);
    if (textTitle.length > 47) {
      textTitle = textTitle.slice(0, 47) + "...";
    }
    await message.startThread({ name: textTitle, reason: "Answer Overflow auto thread" });
  } // Checking if auto thread is enabled on guild
}
