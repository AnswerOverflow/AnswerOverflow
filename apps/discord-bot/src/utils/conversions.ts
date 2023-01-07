import type { Guild, GuildMember, Message } from "discord.js";
import {
  getDefaultDiscordAccount,
  getDefaultServer,
  Message as AOMessage,
} from "@answeroverflow/db";

export function toAOMessage(message: Message): AOMessage {
  if (!message.guild) throw new Error("Message is not in a guild");
  const converted_message: AOMessage = {
    id: message.id,
    content: message.content,
    channel_id: message.channel.id,
    images: message.attachments.map((attachment) => attachment.url),
    replies_to: message.reference?.messageId ?? null,
    author_id: message.author.id,
    server_id: message.guild?.id,
    solutions: [],
    child_thread: message.thread?.id ?? null,
    thread_id: message.channel.isThread() ? message.channel.id : null,
  };
  return converted_message;
}

export function memberToAODiscordAccount(member: GuildMember) {
  return getDefaultDiscordAccount({
    id: member.id,
    name: member.user.username,
    avatar: member.avatar,
  });
}

export function guildToAOServer(guild: Guild) {
  return getDefaultServer({
    id: guild.id,
    name: guild.name,
    icon: guild.icon,
  });
}
