import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { ChannelType, Events, Message } from "discord.js";
import { findChannelById } from "@answeroverflow/db";

@ApplyOptions<Listener.Options>({ event: Events.MessageCreate })
export class OnMessage extends Listener {
  public async run(message: Message) {
    const channelType = message.channel.type;
    const allowedThreadChannelTypes = new Set([
      ChannelType.GuildText,
      ChannelType.GuildAnnouncement,
    ]);
    if (!allowedThreadChannelTypes.has(channelType)) return;
    if (message.author.bot) return;
    if (message.author.system) return;

    // Channel is text based, and message has been sent by a human

    const channel = await findChannelById(message.channelId);
    if (!channel?.flags.autoThreadEnabled) return;
    let textTitle = `${message.member?.nickname ?? message.author.username} - ${
      message.cleanContent
    }`;
    // Remove all markdown characters
    textTitle = textTitle.replace(/(\*|_|~|`)/g, "");
    if (textTitle.length > 47) {
      textTitle = textTitle.slice(0, 47) + "...";
    }
    await message.startThread({ name: textTitle, reason: "Answer Overflow auto thread" });
  } // Checking if auto thread is enabled on guild
}
