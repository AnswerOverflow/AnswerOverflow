import type { GuildTextBasedChannel, Message, User } from "discord.js";
import type { Message as AOMessage } from "@answeroverflow/db";
import type { ChannelUpsertInput, UserUpsertInput } from "@answeroverflow/api";
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

export function toAOUser(user: User) {
  const converted_user: UserUpsertInput = {
    id: user.id,
    name: user.username,
  };
  return converted_user;
}

export function toChannelUpsert(channel: GuildTextBasedChannel) {
  const converted_channel: ChannelUpsertInput = {
    create: {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      server: {
        create: {
          id: channel.guild.id,
          name: channel.guild.name,
        },
        update: {
          name: channel.guild.name,
        },
      },
    },
    update: {
      name: channel.name,
    },
  };
  return converted_channel;
}
