import type {
  AnyThreadChannel,
  Guild,
  GuildBasedChannel,
  GuildChannel,
  Message,
  User,
} from "discord.js";
import {
  getDefaultServer,
  Message as AOMessage,
  Channel as AOChannel,
  Thread as AOThread,
  Server as AOServer,
  DiscordAccount as AODiscordAccount,
} from "@answeroverflow/db";

export function toAOMessage(message: Message): AOMessage {
  if (!message.guild) throw new Error("Message is not in a guild");
  const converted_message: AOMessage = {
    id: message.id,
    content: message.cleanContent,
    channel_id: message.channel.id,
    images: message.attachments.map((attachment) => {
      return {
        url: attachment.url,
        width: attachment.width,
        height: attachment.height,
        description: attachment.description,
      };
    }),
    replies_to: message.reference?.messageId ?? null,
    author_id: message.author.id,
    server_id: message.guild?.id,
    solutions: [],
    child_thread: message.thread?.id ?? null,
    thread_id: message.channel.isThread() ? message.channel.id : null,
  };
  return converted_message;
}

export function toAODiscordAccount(user: User): AODiscordAccount {
  const converted_user: AODiscordAccount = {
    id: user.id,
    avatar: user.avatar,
    name: user.username,
  };
  return converted_user;
}

export function toAOServer(guild: Guild) {
  return getDefaultServer({
    id: guild.id,
    name: guild.name,
    icon: guild.icon,
  });
}

export function toAOChannel(channel: GuildChannel | GuildBasedChannel): AOChannel {
  if (!channel.guild) throw new Error("Channel is not in a guild");
  const converted_channel: AOChannel = {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    parent_id: channel.isThread() ? channel.parentId : null,
    server_id: channel.guild.id,
  };
  return converted_channel;
}

export function toAOChannelWithServer(channel: GuildChannel): AOChannel & { server: AOServer } {
  const converted = toAOChannel(channel);
  return {
    ...converted,
    server: toAOServer(channel.guild),
  };
}

export function toAOThread(thread: AnyThreadChannel): AOThread {
  if (!thread.parent) throw new Error("Thread has no parent");
  const converted_thread: AOThread = {
    id: thread.id,
    name: thread.name,
    parent_id: thread.parent.id,
    type: thread.type,
    server_id: thread.guild.id,
  };
  return converted_thread;
}

export function extractUsersSetFromMessages(messages: Message[]) {
  const users = new Map<string, AODiscordAccount>();
  for (const msg of messages) {
    users.set(msg.author.id, toAODiscordAccount(msg.author));
  }
  return Array.from(users.values());
}

export function extractThreadsSetFromMessages(messages: Message[]) {
  const threads = new Map<string, AOThread>();
  for (const msg of messages) {
    if (msg.thread) {
      threads.set(msg.thread.id, toAOThread(msg.thread));
    }
  }
  return Array.from(threads.values());
}

export function messagesToAOMessagesSet(messages: Message[]) {
  const ao_messages = new Map<string, AOMessage>();
  for (const msg of messages) {
    ao_messages.set(msg.id, toAOMessage(msg));
  }
  return Array.from(ao_messages.values());
}
